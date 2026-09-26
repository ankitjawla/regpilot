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

export type WorkflowNode = Node<WorkflowNodeData, "workflow">;

const NODE_W = 168;
const NODE_H = 92;

/**
 * Hand-tuned layered DAG:
 *  row0 intake → guardrail → triage → router
 *  row1 draft under router
 *  row2 TypeSafe enrichment cluster
 *  row3 gate → human → export, with eval as left spur
 */
const POSITIONS: Record<string, { x: number; y: number }> = {
  intake: { x: 0, y: 24 },
  guardrail: { x: 210, y: 24 },
  triage: { x: 420, y: 24 },
  router: { x: 630, y: 24 },
  draft: { x: 630, y: 168 },
  dedupe: { x: 0, y: 340 },
  grounding: { x: 210, y: 340 },
  playbook: { x: 420, y: 340 },
  hazard: { x: 630, y: 340 },
  confidence: { x: 840, y: 340 },
  gate: { x: 840, y: 510 },
  human: { x: 1050, y: 510 },
  export: { x: 1260, y: 510 },
  eval: { x: 630, y: 510 },
};

type EdgeDef = {
  source: WorkflowStep["id"];
  target: WorkflowStep["id"];
  spur?: boolean;
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
    target: "triage",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "triage",
    target: "router",
    sourceHandle: "right",
    targetHandle: "left",
  },
  { source: "router", target: "draft" },
  { source: "draft", target: "dedupe" },
  {
    source: "dedupe",
    target: "grounding",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "grounding",
    target: "playbook",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "playbook",
    target: "hazard",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "hazard",
    target: "confidence",
    sourceHandle: "right",
    targetHandle: "left",
  },
  { source: "confidence", target: "gate" },
  {
    source: "gate",
    target: "human",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "human",
    target: "export",
    sourceHandle: "right",
    targetHandle: "left",
  },
  {
    source: "gate",
    target: "eval",
    spur: true,
    sourceHandle: "out-left",
    targetHandle: "in-right",
  },
];

export function buildWorkflowGraph(
  steps: WorkflowStep[],
  opts: {
    activeId: string | null;
    liveId: string | null;
    runtimeReady: (runtime: WorkflowStep["runtime"]) => boolean | null;
  }
): { nodes: WorkflowNode[]; edges: Edge[] } {
  const byId = new Map(steps.map((s, i) => [s.id, { step: s, index: i }]));

  const nodes: WorkflowNode[] = steps.map(({ id }, i) => {
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

  const edges: Edge[] = EDGE_DEFS.filter(
    (e) => byId.has(e.source) && byId.has(e.target)
  ).map((e) => {
    const onPulse = opts.liveId === e.target;
    return {
      id: `${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: "smoothstep",
      animated: onPulse || Boolean(e.spur),
      className: e.spur
        ? "rp-flow-edge rp-flow-edge--spur"
        : onPulse
          ? "rp-flow-edge rp-flow-edge--live"
          : "rp-flow-edge",
      style: {
        stroke: onPulse
          ? "var(--sage)"
          : e.spur
            ? "color-mix(in srgb, var(--ink-mute) 70%, var(--line))"
            : "color-mix(in srgb, var(--ink-mute) 55%, var(--line))",
        strokeWidth: onPulse ? 2.25 : e.spur ? 1.25 : 1.5,
        strokeDasharray: e.spur ? "5 4" : undefined,
      },
    };
  });

  return { nodes, edges };
}

export { NODE_W, NODE_H };
