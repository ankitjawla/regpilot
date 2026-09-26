/** Shared stage ids for the live pipeline session and SSE stream. */

export const PIPELINE_STAGE_IDS = [
  "intake",
  "guardrail",
  "blocked",
  "triage",
  "router",
  "fastpath",
  "draft",
  "dedupe",
  "grounding",
  "playbook",
  "hazard",
  "confidence",
  "gate",
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGE_IDS)[number];

export type StageState = "pending" | "running" | "done" | "skipped" | "blocked";

export type StageEvent = {
  type: "stage";
  id: PipelineStageId;
  state: Exclude<StageState, "pending">;
  detail?: string;
};

export type PipelineResultPayload = {
  blocked?: boolean;
  itemId?: number;
  guardrail?: {
    piiFound: boolean;
    redactions: string[];
    injectionSuspected: boolean;
    reason: string;
  };
  triage?: {
    category: string;
    urgency: string;
    jurisdiction: string;
    confidence: number;
    rationale: string;
  };
  route?: { fastPath: boolean; model: string; reason: string };
  jev?: { model: string; latencyMs: number | null };
  obligations?: {
    owner: string;
    action: string;
    due_date: string;
    source_quote: string;
  }[];
  memo?: string;
  modelUsed?: string;
  confidence?: { score: number; reasons: string[]; model?: string };
  gate?: { status: string; label: string };
  status?: string;
  grounding?: {
    model?: string;
    overallSupported?: number;
    inventedClaims?: number;
    unsupportedCount?: number;
  } | null;
  provenance?: {
    judgments?: {
      hazard?: { disposition?: string };
      playbook?: { playbookId?: string; meanCoverage?: number };
      dedupe?: { mergeSuggestions?: unknown[] };
      grounding?: {
        overallSupported?: number;
      };
    } | null;
  };
  error?: string;
  stage?: string;
};

/** One stage row reconstructed for the session graph. */
export type ReconstructedStage = {
  id: PipelineStageId;
  state: StageState;
  detail?: string;
};

function clipDetail(text: string, max = 96): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}

/**
 * Build the stage trail from a finished pipeline payload.
 * Used when the browser received one JSON body (no stage events), so the
 * workflow still shows the path that actually ran — including why each
 * block was taken or skipped.
 */
export function stagesFromPayload(
  payload: PipelineResultPayload
): ReconstructedStage[] {
  const guardrailBlock = Boolean(payload.blocked) && !payload.triage;
  const judgments = payload.provenance?.judgments ?? null;
  const rows = new Map<PipelineStageId, { state: StageState; detail?: string }>();
  const set = (id: PipelineStageId, state: StageState, detail?: string) => {
    rows.set(id, {
      state,
      detail: detail ? clipDetail(detail) : undefined,
    });
  };

  set(
    "intake",
    "done",
    payload.itemId != null ? `item ${payload.itemId}` : "accepted"
  );
  set(
    "guardrail",
    "done",
    payload.guardrail?.reason || (guardrailBlock ? "blocked" : "passed")
  );

  if (guardrailBlock) {
    set("blocked", "blocked", payload.guardrail?.reason || "blocked");
    for (const id of PIPELINE_STAGE_IDS) {
      if (id === "intake" || id === "guardrail" || id === "blocked") continue;
      set(id, "skipped");
    }
  } else {
    set("blocked", "skipped");
    const triage = payload.triage;
    set(
      "triage",
      triage ? "done" : "skipped",
      triage
        ? `${triage.category} · ${triage.urgency} · ${triage.jurisdiction}`
        : undefined
    );
    const route = payload.route;
    set("router", route ? "done" : "skipped", route?.reason);
    set(
      "fastpath",
      route?.fastPath ? "done" : "skipped",
      route?.fastPath ? route.model : undefined
    );
    const obligationCount = payload.obligations?.length ?? 0;
    set(
      "draft",
      payload.memo || payload.modelUsed ? "done" : "skipped",
      payload.modelUsed
        ? `${obligationCount} obligation(s) · ${payload.modelUsed}`
        : undefined
    );
    const dedupe = judgments?.dedupe;
    set(
      "dedupe",
      dedupe ? "done" : "skipped",
      dedupe
        ? `${dedupe.mergeSuggestions?.length ?? 0} merge suggestion(s)`
        : undefined
    );
    const grounding = payload.grounding ?? judgments?.grounding ?? null;
    const supported =
      grounding && typeof grounding.overallSupported === "number"
        ? Math.round(grounding.overallSupported * 100)
        : null;
    set(
      "grounding",
      grounding ? "done" : "skipped",
      supported != null ? `supported ${supported}%` : grounding ? "checked" : undefined
    );
    const playbook = judgments?.playbook;
    set(
      "playbook",
      playbook ? "done" : "skipped",
      playbook
        ? `${playbook.playbookId || "playbook"}${
            typeof playbook.meanCoverage === "number"
              ? ` · ${playbook.meanCoverage.toFixed(2)}`
              : ""
          }`
        : undefined
    );
    const hazard = judgments?.hazard;
    set("hazard", hazard ? "done" : "skipped", hazard?.disposition);
    const score = payload.confidence?.score;
    set(
      "confidence",
      typeof score === "number" ? "done" : "skipped",
      typeof score === "number" ? score.toFixed(2) : undefined
    );
    const gate = payload.gate;
    const gateBlocked = gate?.status === "blocked";
    set(
      "gate",
      gate ? (gateBlocked ? "blocked" : "done") : "skipped",
      gate?.label || gate?.status
    );
  }

  return PIPELINE_STAGE_IDS.map((id) => {
    const row = rows.get(id) ?? { state: "pending" as const };
    return { id, state: row.state, detail: row.detail };
  });
}

export type PipelineStreamMessage =
  | StageEvent
  | { type: "result"; payload: PipelineResultPayload }
  | { type: "error"; error: string; stage?: string };

export function isPipelineStageId(id: string): id is PipelineStageId {
  return (PIPELINE_STAGE_IDS as readonly string[]).includes(id);
}
