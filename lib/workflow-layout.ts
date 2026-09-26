import type { Edge, Node } from "@xyflow/react";
import type { WorkflowStep } from "@/lib/agents";

export type WorkflowNodeData = {
  step: WorkflowStep;
  index: number;
  ready: boolean | null;
  isLive: boolean;
  isActive: boolean;
  [key: string]: unknown;
};

export type LaneLabelData = {
  label: string;
  hint: string;
  [key: string]: unknown;
};

export type WorkflowNode = Node<WorkflowNodeData, "workflow">;
export type LaneLabelNode = Node<LaneLabelData, "laneLabel">;
export type FlowNode = WorkflowNode | LaneLabelNode;

const NODE_W = 168;
const NODE_H = 92;

/**
 * Branched DAG (not a single strip):
 *
 *  Intake → Guardrail ─┬→ (blocked) end
 *                      └→ Triage → Router ─┬→ Fast path ──┐
 *                                          └→ Draft ──┐   │
 *                     parallel Jev cluster ←──────────┘   │
 *                       dedupe / grounding / playbook /   │
 *                       hazard → Confidence ←─────────────┘
 *                                → Gate ─┬→ Human → Export
 *                                        └→ Eval (spur)
 *                           Human ──loop──→ Draft (re-analyze)
 */
const POSITIONS: Record<string, { x: number; y: number }> = {
  // Admit
  intake: { x: 40, y: 120 },
  guardrail: { x: 260, y: 120 },
  // Block dead-end
  blocked: { x: 260, y: 300 },
  // Classify
  triage: { x: 500, y: 120 },
  router: { x: 740, y: 120 },
  // Branch: fast vs full
  draft: { x: 980, y: 40 },
  fastpath: { x: 980, y: 240 },
  // Parallel enrichment fan-out
  dedupe: { x: 1220, y: 0 },
  grounding: { x: 1220, y: 110 },
  playbook: { x: 1220, y: 220 },
  hazard: { x: 1220, y: 330 },
  // Merge + close
  confidence: { x: 1480, y: 160 },
  gate: { x: 1720, y: 160 },
  human: { x: 1960, y: 80 },
  export: { x: 2200, y: 80 },
  eval: { x: 1960, y: 280 },
};

const LANES: { id: string; label: string; hint: string; x: number; y: number }[] =
  [
    {
      id: "lane-admit",
      label: "1 · Admit",
      hint: "Intake + guardrail",
      x: 40,
      y: 24,
    },
    {
      id: "lane-decide",
      label: "2 · Decide",
      hint: "Jev triage + route",
      x: 500,
      y: 24,
    },
    {
      id: "lane-draft",
      label: "3 · Draft",
      hint: "Azure write path",
      x: 980,
      y: -40,
    },
    {
      id: "lane-verify",
      label: "4 · Verify (parallel)",
      hint: "Jev checks fan out",
      x: 1220,
      y: -40,
    },
    {
      id: "lane-close",
      label: "5 · Close",
      hint: "Score → gate → human",
      x: 1720,
      y: 24,
    },
  ];

type EdgeKind = "main" | "parallel" | "bypass" | "block" | "loop" | "spur";

type EdgeDef = {
  source: string;
  target: string;
  kind?: EdgeKind;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
};

const EDGE_DEFS: EdgeDef[] = [
  {
    source: "intake",
    target: "guardrail",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "guardrail",
    target: "blocked",
    kind: "block",
    label: "block",
    sourceHandle: "bottom",
    targetHandle: "top",
  },
  {
    source: "guardrail",
    target: "triage",
    label: "pass",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "triage",
    target: "router",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "router",
    target: "draft",
    label: "full",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "router",
    target: "fastpath",
    kind: "bypass",
    label: "fast",
    sourceHandle: "bottom",
    targetHandle: "left",
  },
  // Fan-out from draft into parallel Jev cluster
  {
    source: "draft",
    target: "dedupe",
    kind: "parallel",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "draft",
    target: "grounding",
    kind: "parallel",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "draft",
    target: "playbook",
    kind: "parallel",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "draft",
    target: "hazard",
    kind: "parallel",
    sourceHandle: "right",
    targetHandle: "left",
  },
  // Fan-in to confidence
  {
    source: "dedupe",
    target: "confidence",
    kind: "parallel",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "grounding",
    target: "confidence",
    kind: "parallel",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "playbook",
    target: "confidence",
    kind: "parallel",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "hazard",
    target: "confidence",
    kind: "parallel",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "fastpath",
    target: "confidence",
    kind: "bypass",
    label: "skip draft",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "confidence",
    target: "gate",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "gate",
    target: "human",
    label: "review",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "human",
    target: "export",
    label: "approve",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "gate",
    target: "eval",
    kind: "spur",
    label: "calibrate",
    sourceHandle: "bottom",
    targetHandle: "top",
  },
  {
    source: "human",
    target: "draft",
    kind: "loop",
    label: "re-analyze",
    sourceHandle: "bottom",
    targetHandle: "bottom-in",
  },
];

/** Synthetic nodes that illustrate branches (not in WORKFLOW_STEPS). */
export const SYNTHETIC_STEPS: WorkflowStep[] = [
  {
    id: "blocked",
    title: "Blocked",
    role: "Injection / policy block — Azure never runs. Audited and stopped.",
    runtime: "rules",
    implementation: "lib/jev.ts#jevGuardrail · audit guardrail.block",
    apis: ["POST /api/triage", "POST /api/pipeline"],
  },
  {
    id: "fastpath",
    title: "Fast path",
    role: "High-confidence routine items skip heavy draft; still scored at the gate.",
    runtime: "rules",
    implementation: "lib/jev.ts#routeDecision · azure small / skip",
    apis: ["POST /api/triage", "POST /api/pipeline"],
  },
];

/** Pulse order shows the happy path, then a parallel verify, then close. */
export const PULSE_ORDER: string[] = [
  "intake",
  "guardrail",
  "triage",
  "router",
  "draft",
  "dedupe",
  "grounding",
  "playbook",
  "hazard",
  "confidence",
  "gate",
  "human",
  "export",
  "fastpath",
  "eval",
  "blocked",
];

function edgeClass(kind: EdgeKind, onPulse: boolean): string {
  const base = "rp-flow-edge";
  if (onPulse) return `${base} rp-flow-edge--live`;
  switch (kind) {
    case "main":
      return base;
    case "parallel":
      return `${base} rp-flow-edge--parallel`;
    case "bypass":
      return `${base} rp-flow-edge--bypass`;
    case "block":
      return `${base} rp-flow-edge--block`;
    case "loop":
      return `${base} rp-flow-edge--loop`;
    case "spur":
      return `${base} rp-flow-edge--spur`;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function edgeStroke(kind: EdgeKind, onPulse: boolean): string {
  if (onPulse) return "var(--sage)";
  switch (kind) {
    case "main":
      return "color-mix(in srgb, var(--ink-mute) 55%, var(--line))";
    case "parallel":
      return "color-mix(in srgb, var(--sage) 55%, var(--line))";
    case "bypass":
      return "color-mix(in srgb, var(--sky) 65%, var(--line))";
    case "block":
      return "color-mix(in srgb, var(--coral) 70%, var(--line))";
    case "loop":
      return "color-mix(in srgb, var(--amber) 70%, var(--line))";
    case "spur":
      return "color-mix(in srgb, var(--ink-mute) 70%, var(--line))";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function buildWorkflowGraph(
  steps: WorkflowStep[],
  opts: {
    activeId: string | null;
    liveId: string | null;
    runtimeReady: (runtime: WorkflowStep["runtime"]) => boolean | null;
  }
): { nodes: FlowNode[]; edges: Edge[] } {
  const byId = new Map(steps.map((s, i) => [s.id, { step: s, index: i }]));

  const workflowNodes: WorkflowNode[] = steps.map(({ id }, i) => {
    const entry = byId.get(id)!;
    const pos = POSITIONS[id] ?? { x: i * 200, y: 0 };
    return {
      id,
      type: "workflow",
      position: pos,
      data: {
        step: entry.step,
        index: entry.index,
        ready: opts.runtimeReady(entry.step.runtime),
        isLive: opts.liveId === id,
        isActive: opts.activeId === id,
      },
      style: { width: NODE_W, height: NODE_H },
    };
  });

  const syntheticNodes: WorkflowNode[] = SYNTHETIC_STEPS.map((step, i) => ({
    id: step.id,
    type: "workflow" as const,
    position: POSITIONS[step.id] ?? { x: 0, y: 0 },
    data: {
      step,
      index: steps.length + i,
      ready: true,
      isLive: opts.liveId === step.id,
      isActive: opts.activeId === step.id,
    },
    style: { width: NODE_W, height: NODE_H },
  }));

  const laneNodes: LaneLabelNode[] = LANES.map((lane) => ({
    id: lane.id,
    type: "laneLabel",
    position: { x: lane.x, y: lane.y },
    draggable: false,
    selectable: false,
    data: { label: lane.label, hint: lane.hint },
    style: { width: 200, height: 44 },
  }));

  const known = new Set<string>([
    ...byId.keys(),
    ...SYNTHETIC_STEPS.map((s) => s.id),
  ]);

  const edges: Edge[] = EDGE_DEFS.filter(
    (e) => known.has(e.source) && known.has(e.target)
  ).map((e) => {
    const kind: EdgeKind = e.kind ?? "main";
    const onPulse = opts.liveId === e.target;
    return {
      id: `${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: kind === "loop" ? "smoothstep" : "smoothstep",
      label: e.label,
      animated:
        onPulse || kind === "spur" || kind === "parallel" || kind === "loop",
      className: edgeClass(kind, onPulse),
      labelStyle: {
        fill: "var(--ink-mute)",
        fontSize: 10,
        fontWeight: 600,
      },
      labelBgStyle: {
        fill: "var(--paper)",
        fillOpacity: 0.92,
      },
      labelBgPadding: [4, 6] as [number, number],
      labelBgBorderRadius: 6,
      style: {
        stroke: edgeStroke(kind, onPulse),
        strokeWidth: onPulse ? 2.25 : kind === "parallel" ? 1.35 : 1.5,
        strokeDasharray:
          kind === "spur" || kind === "bypass" || kind === "loop"
            ? "6 4"
            : kind === "block"
              ? "3 3"
              : undefined,
      },
    };
  });

  return {
    nodes: [...laneNodes, ...workflowNodes, ...syntheticNodes],
    edges,
  };
}

export { NODE_W, NODE_H };

export function resolveWorkflowStep(
  steps: WorkflowStep[],
  id: string | null
): WorkflowStep | null {
  if (!id) return null;
  return (
    steps.find((s) => s.id === id) ||
    SYNTHETIC_STEPS.find((s) => s.id === id) ||
    null
  );
}
