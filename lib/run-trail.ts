// Saved stage trail for one item. The browser session is local; this is the
// copy Workflow and the package page read after a reload or a second examiner.

import { query } from "@/lib/db";
import {
  PIPELINE_STAGE_IDS,
  stagesFromPayload,
  type PipelineResultPayload,
  type PipelineStageId,
  type StageState,
} from "@/lib/pipeline-events";

export type TrailStageId = PipelineStageId | "human" | "export";

export type TrailStage = {
  id: TrailStageId;
  state: StageState;
  detail?: string;
};

export type RunTrail = {
  version: 1;
  itemId: number;
  blocked: boolean;
  fastPath: boolean;
  gateStatus?: string;
  stages: TrailStage[];
  updatedAt: string;
};

const TRAIL_IDS: readonly TrailStageId[] = [
  ...PIPELINE_STAGE_IDS,
  "human",
  "export",
];

function isStageState(value: unknown): value is StageState {
  return (
    value === "pending" ||
    value === "running" ||
    value === "done" ||
    value === "skipped" ||
    value === "blocked"
  );
}

function isTrailId(value: unknown): value is TrailStageId {
  return typeof value === "string" && (TRAIL_IDS as readonly string[]).includes(value);
}

export function parseRunTrail(raw: unknown): RunTrail | null {
  const value =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return null;
          }
        })()
      : raw;
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<RunTrail>;
  if (row.version !== 1 || !Array.isArray(row.stages)) return null;
  const stages: TrailStage[] = [];
  for (const stage of row.stages) {
    if (!stage || typeof stage !== "object") continue;
    const id = (stage as { id?: unknown }).id;
    const state = (stage as { state?: unknown }).state;
    if (!isTrailId(id) || !isStageState(state)) continue;
    const detail = (stage as { detail?: unknown }).detail;
    stages.push({
      id,
      state,
      detail: typeof detail === "string" && detail ? detail : undefined,
    });
  }
  if (!stages.length) return null;
  return {
    version: 1,
    itemId: typeof row.itemId === "number" ? row.itemId : 0,
    blocked: Boolean(row.blocked),
    fastPath: Boolean(row.fastPath),
    gateStatus: typeof row.gateStatus === "string" ? row.gateStatus : undefined,
    stages,
    updatedAt:
      typeof row.updatedAt === "string"
        ? row.updatedAt
        : new Date().toISOString(),
  };
}

/** Pipeline stages plus the human and export nodes the live session does not emit. */
export function trailFromPayload(payload: PipelineResultPayload): RunTrail {
  const pipeline = stagesFromPayload(payload);
  const guardrailBlock = Boolean(payload.blocked) && !payload.triage;
  const gateStatus = payload.gate?.status || payload.status;
  let human: TrailStage;
  let exported: TrailStage;
  if (guardrailBlock || gateStatus === "blocked") {
    human = { id: "human", state: "skipped", detail: "stopped before review" };
    exported = { id: "export", state: "skipped", detail: "stopped before export" };
  } else if (gateStatus === "auto_approved") {
    human = { id: "human", state: "skipped", detail: "auto-approved" };
    exported = { id: "export", state: "pending", detail: "ready to export" };
  } else {
    human = {
      id: "human",
      state: "pending",
      detail: payload.gate?.label,
    };
    exported = { id: "export", state: "pending" };
  }
  return {
    version: 1,
    itemId: payload.itemId ?? 0,
    blocked: Boolean(payload.blocked),
    fastPath: Boolean(payload.route?.fastPath),
    gateStatus,
    stages: [...pipeline, human, exported],
    updatedAt: new Date().toISOString(),
  };
}

export function patchTrail(
  trail: RunTrail | null,
  itemId: number,
  patches: { id: TrailStageId; state: StageState; detail?: string }[]
): RunTrail {
  const base: RunTrail = trail ?? {
    version: 1,
    itemId,
    blocked: false,
    fastPath: false,
    stages: [],
    updatedAt: new Date().toISOString(),
  };
  const stages = [...base.stages];
  for (const patch of patches) {
    const index = stages.findIndex((s) => s.id === patch.id);
    const next: TrailStage = {
      id: patch.id,
      state: patch.state,
      detail: patch.detail,
    };
    if (index >= 0) stages[index] = next;
    else stages.push(next);
  }
  return {
    ...base,
    itemId,
    stages,
    updatedAt: new Date().toISOString(),
  };
}

export async function writeRunTrail(itemId: number, trail: RunTrail): Promise<void> {
  await query(`UPDATE regpilot_items SET run_trail=$2::jsonb WHERE id=$1`, [
    itemId,
    JSON.stringify({ ...trail, itemId }),
  ]);
}

/** Merge human/export (or any stage) onto the stored trail. Creates one if missing. */
export async function markTrailStages(
  itemId: number,
  patches: { id: TrailStageId; state: StageState; detail?: string }[]
): Promise<RunTrail> {
  const rows = await query<{ run_trail: unknown }>(
    `SELECT run_trail FROM regpilot_items WHERE id=$1`,
    [itemId]
  );
  const next = patchTrail(parseRunTrail(rows[0]?.run_trail), itemId, patches);
  await writeRunTrail(itemId, next);
  return next;
}
