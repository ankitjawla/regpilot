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
  error?: string;
  stage?: string;
};

export type PipelineStreamMessage =
  | StageEvent
  | { type: "result"; payload: PipelineResultPayload }
  | { type: "error"; error: string; stage?: string };

export function isPipelineStageId(id: string): id is PipelineStageId {
  return (PIPELINE_STAGE_IDS as readonly string[]).includes(id);
}
