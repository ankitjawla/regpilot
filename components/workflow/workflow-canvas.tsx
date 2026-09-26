"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { WorkflowStep } from "@/lib/agents";
import {
  buildWorkflowGraph,
  type WorkflowNode,
} from "@/lib/workflow-layout";
import {
  WorkflowStepNode,
  type WorkflowFlowNode,
} from "@/components/workflow/workflow-node";

const nodeTypes = { workflow: WorkflowStepNode };

function FitViewOnLoad({ stepCount }: { stepCount: number }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (!stepCount) return;
    const id = window.requestAnimationFrame(() => {
      fitView({ padding: 0.18, duration: 420, maxZoom: 1.05 });
    });
    return () => window.cancelAnimationFrame(id);
  }, [fitView, stepCount]);
  return null;
}

function WorkflowCanvasInner({
  steps,
  activeId,
  liveId,
  runtimeReady,
  onSelect,
}: {
  steps: WorkflowStep[];
  activeId: string | null;
  liveId: string | null;
  runtimeReady: (runtime: WorkflowStep["runtime"]) => boolean | null;
  onSelect: (id: string) => void;
}) {
  const { nodes: builtNodes, edges: builtEdges } = useMemo(
    () =>
      buildWorkflowGraph(steps, {
        activeId,
        liveId,
        runtimeReady,
      }),
    [steps, activeId, liveId, runtimeReady]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(builtEdges);

  useEffect(() => {
    setNodes(builtNodes as WorkflowFlowNode[]);
    setEdges(builtEdges);
  }, [builtNodes, builtEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler<WorkflowFlowNode> = useCallback(
    (_event, node) => {
      onSelect(node.id);
    },
    [onSelect]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.18, maxZoom: 1.05 }}
      minZoom={0.35}
      maxZoom={1.6}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      panOnScroll
      zoomOnScroll
      className="rp-flow-canvas"
    >
      <FitViewOnLoad stepCount={steps.length} />
      <Background
        variant={BackgroundVariant.Dots}
        gap={18}
        size={1.1}
        color="color-mix(in srgb, var(--ink-mute) 28%, transparent)"
      />
      <Controls
        showInteractive={false}
        className="rp-flow-controls"
      />
      <MiniMap
        className="rp-flow-minimap"
        pannable
        zoomable
        nodeStrokeWidth={2}
        maskColor="rgba(14, 26, 43, 0.08)"
        nodeColor={(n) => {
          const data = (n as WorkflowNode).data;
          if (!data?.step) return "#c5d0dc";
          switch (data.step.runtime) {
            case "typesafe":
              return "#0f766e";
            case "azure":
              return "#0369a1";
            case "human":
              return "#b45309";
            case "rules":
            case "ui":
              return "#5a6b7d";
            default: {
              const _exhaustive: never = data.step.runtime;
              return _exhaustive;
            }
          }
        }}
      />
    </ReactFlow>
  );
}

export function WorkflowCanvas(props: {
  steps: WorkflowStep[];
  activeId: string | null;
  liveId: string | null;
  runtimeReady: (runtime: WorkflowStep["runtime"]) => boolean | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
