"use client";

import type { CSSProperties } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { WorkflowStep } from "@/lib/agents";
import type { WorkflowNodeData } from "@/lib/workflow-layout";

const RUNTIME_TONE: Record<
  WorkflowStep["runtime"],
  { badge: string; accent: string }
> = {
  typesafe: {
    badge: "bg-[var(--sage-soft)] text-[var(--sage)]",
    accent: "var(--sage)",
  },
  azure: {
    badge: "bg-[var(--sky-soft)] text-[var(--sky)]",
    accent: "var(--sky)",
  },
  rules: {
    badge: "bg-[#e8eef4] text-[#3d4b5c]",
    accent: "#5a6b7d",
  },
  human: {
    badge: "bg-[var(--amber-soft)] text-[var(--amber)]",
    accent: "var(--amber)",
  },
  ui: {
    badge: "bg-[#e8eef4] text-[#3d4b5c]",
    accent: "#3d4b5c",
  },
};

function runtimeTone(runtime: WorkflowStep["runtime"]) {
  switch (runtime) {
    case "typesafe":
    case "azure":
    case "rules":
    case "human":
    case "ui":
      return RUNTIME_TONE[runtime];
    default: {
      const _exhaustive: never = runtime;
      return _exhaustive;
    }
  }
}

export type WorkflowFlowNode = Node<WorkflowNodeData, "workflow">;

export function WorkflowStepNode({ data }: NodeProps<WorkflowFlowNode>) {
  const { step, index, ready, isLive, isActive } = data;
  const tone = runtimeTone(step.runtime);

  return (
    <div
      className={`rp-flow-node ${isActive ? "is-active" : ""} ${
        isLive ? "is-pulse" : ""
      }`}
      style={
        {
          "--rp-node-accent": tone.accent,
        } as CSSProperties
      }
    >
      <Handle
        type="target"
        position={Position.Top}
        className="rp-flow-handle"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="rp-flow-handle"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="in-right"
        className="rp-flow-handle"
      />
      <span className="rp-flow-node-index">{String(index + 1).padStart(2, "0")}</span>
      <span className="rp-flow-node-title">{step.title}</span>
      <span className="rp-flow-node-meta">
        <span className={`rp-flow-badge ${tone.badge}`}>{step.runtime}</span>
        {ready != null && (
          <span
            className={`rp-flow-ready ${ready ? "is-ready" : "is-warn"}`}
            title={ready ? "Service ready" : "Service not configured"}
          />
        )}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="rp-flow-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="rp-flow-handle"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out-left"
        className="rp-flow-handle"
      />
    </div>
  );
}
