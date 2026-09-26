"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, Badge } from "@/components/ui";
import type { AgentConfig, WorkflowStep } from "@/lib/agents";
import { JevPrimerCard } from "@/components/jev-primer";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { WorkflowDetailSheet } from "@/components/workflow/workflow-detail";
import {
  PULSE_ORDER,
  resolveWorkflowStep,
} from "@/lib/workflow-layout";
import { usePipelineRun } from "@/components/pipeline-run";
import type { StageState } from "@/lib/pipeline-events";

type Health = {
  ok?: boolean;
  services?: {
    typesafe?: { configured?: boolean; model?: string };
    azureOpenAI?: {
      configured?: boolean;
      deployment?: string;
      smallDeployment?: string;
    };
    database?: { configured?: boolean };
  };
};

export default function WorkflowPage() {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const { run, clearRun } = usePipelineRun();
  const stageView = useMemo(() => {
    if (!run) return { states: null, details: null };
    const states: Record<string, StageState> = {};
    const details: Record<string, string> = {};
    for (const stage of run.stages) {
      states[stage.id] = stage.state;
      if (stage.detail) details[stage.id] = stage.detail;
    }
    return { states, details };
  }, [run]);
  const stageStates = stageView.states;
  const stageDetails = stageView.details;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/agents").then((r) => r.json()),
      fetch("/api/health").then((r) => r.json()),
    ])
      .then(([agents, h]) => {
        if (cancelled) return;
        const workflow: WorkflowStep[] = agents.workflow || [];
        setSteps(workflow);
        setConfig(agents.config);
        setHealth(h);
        if (workflow[0]) setActiveId(workflow[0].id);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load workflow catalog.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Demo pulse only when this tab has no live pipeline session.
  useEffect(() => {
    if (!steps.length || run) {
      setLiveId(null);
      return;
    }
    const path = PULSE_ORDER.filter(
      (id) =>
        steps.some((s) => s.id === id) ||
        id === "blocked" ||
        id === "fastpath"
    );
    if (!path.length) return;
    const id = window.setInterval(() => {
      setLiveId((prev) => {
        if (prev == null) return path[0] ?? null;
        const idx = path.indexOf(prev);
        const next = idx < 0 ? 0 : (idx + 1) % path.length;
        return path[next] ?? null;
      });
    }, 1400);
    return () => window.clearInterval(id);
  }, [steps, run]);

  const activeStep = useMemo(
    () => resolveWorkflowStep(steps, activeId),
    [steps, activeId]
  );

  const activeIndex = useMemo(() => {
    if (!activeStep) return -1;
    const fromCatalog = steps.findIndex((s) => s.id === activeStep.id);
    return fromCatalog >= 0 ? fromCatalog : steps.length;
  }, [steps, activeStep]);

  const runtimeReady = useCallback(
    (runtime: WorkflowStep["runtime"]): boolean | null => {
      if (!health) return null;
      switch (runtime) {
        case "typesafe":
          return Boolean(health.services?.typesafe?.configured);
        case "azure":
          return Boolean(health.services?.azureOpenAI?.configured);
        case "rules":
        case "ui":
        case "human":
          return Boolean(health.services?.database?.configured ?? true);
        default: {
          const _exhaustive: never = runtime;
          return _exhaustive;
        }
      }
    },
    [health]
  );

  const onSelect = useCallback((id: string) => {
    setActiveId(id);
    setSheetOpen(true);
  }, []);

  return (
    <div>
      <PageHeader
        title="Workflow"
        subtitle="End-to-end map of RegPilot — green nodes are Jev (System One) judgments; blue is Azure drafting; rules and humans close the loop."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/agents"
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[var(--paper-2)]"
            >
              Edit agents
            </Link>
            <Link
              href="/intake"
              className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ink-2)]"
            >
              Run intake
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-[var(--radius)] border border-[var(--coral)]/30 bg-white p-4 text-sm text-[var(--coral)]">
          {error}
        </div>
      )}

      {run && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-white px-4 py-3 shadow-[var(--shadow)]">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-mute)]">
              Session run
            </div>
            <p className="mt-1 text-sm font-semibold text-[var(--ink)]">
              {run.status === "running"
                ? "Executing this pipeline"
                : run.status === "error"
                  ? "Pipeline stopped"
                  : run.blocked
                    ? "Blocked at guardrail"
                    : "Finished path"}
              {run.itemId != null ? ` · item ${run.itemId}` : ""}
            </p>
            <p className="text-xs text-[var(--ink-mute)]">
              {run.title}
              {run.result?.gate?.label ? ` · ${run.result.gate.label}` : ""}
              {run.error ? ` · ${run.error}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/intake"
              className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
            >
              Back to intake
            </Link>
            {run.itemId != null && (
              <Link
                href={`/items/${run.itemId}`}
                className="rounded-lg bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-white"
              >
                Open package
              </Link>
            )}
            <button
              type="button"
              onClick={clearRun}
              className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold"
            >
              Clear run
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <JevPrimerCard compact />
      </div>

      <section className="rp-flow-stage">
        <div className="rp-flow-stage-head">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-mute)]">
              Pipeline
            </div>
            <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
              {run ? "This run" : "Live flow"}
            </h2>
            <p className="mt-1 max-w-xl text-xs text-[var(--ink-mute)]">
              {run
                ? "Nodes follow the pipeline you started on Intake. Done, running, skipped, and blocked stay in this browser tab."
                : "Click any node for what goes in, what goes out, and how the next block is chosen. Run a pipeline to light the real path."}
            </p>
            <ul className="rp-flow-legend" aria-label="Edge legend">
              <li>
                <span className="rp-flow-legend-swatch is-main" /> Main
              </li>
              <li>
                <span className="rp-flow-legend-swatch is-parallel" /> Parallel
                Jev
              </li>
              <li>
                <span className="rp-flow-legend-swatch is-bypass" /> Fast path
              </li>
              <li>
                <span className="rp-flow-legend-swatch is-block" /> Block
              </li>
              <li>
                <span className="rp-flow-legend-swatch is-loop" /> Re-analyze
              </li>
            </ul>
          </div>
          <div className="rp-flow-status-row" aria-label="Service health">
            <StatusChip
              label="TypeSafe"
              live={Boolean(health?.services?.typesafe?.configured)}
              detail={health?.services?.typesafe?.model || "—"}
            />
            <StatusChip
              label="Azure"
              live={Boolean(health?.services?.azureOpenAI?.configured)}
              detail={health?.services?.azureOpenAI?.deployment || "—"}
            />
            <StatusChip
              label="Neon"
              live={Boolean(health?.services?.database?.configured)}
              detail="regpilot_*"
            />
          </div>
        </div>

        <div
          className={`rp-flow-body ${sheetOpen && activeStep ? "has-sheet" : ""}`}
        >
          <div className="rp-flow-viewport">
            {steps.length > 0 ? (
              <WorkflowCanvas
                steps={steps}
                activeId={activeId}
                liveId={run ? null : liveId}
                stageStates={stageStates}
                stageDetails={stageDetails}
                runtimeReady={runtimeReady}
                onSelect={onSelect}
              />
            ) : (
              !error && (
                <div className="flex h-full items-center justify-center text-sm text-[var(--ink-mute)]">
                  Loading pipeline…
                </div>
              )
            )}
          </div>

          {sheetOpen && activeStep && (
            <WorkflowDetailSheet
              step={activeStep}
              index={activeIndex}
              config={config}
              ready={runtimeReady(activeStep.runtime)}
              runState={
                activeStep ? (stageStates?.[activeStep.id] ?? null) : null
              }
              runDetail={
                activeStep ? (stageDetails?.[activeStep.id] ?? null) : null
              }
              onClose={() => setSheetOpen(false)}
            />
          )}
        </div>
      </section>

      <p className="mt-4 text-xs leading-relaxed text-[var(--ink-mute)]">
        Branches: Guardrail can <em>block</em> or pass to Triage. Router splits{" "}
        <em>full draft</em> vs <em>fast path</em>. Draft fans out into parallel
        Jev checks (dedupe, grounding, playbook, hazard) that merge at
        Confidence → Gate. Humans can <em>re-analyze</em> (loop to Draft). Eval
        is a side spur (no production write).
      </p>
    </div>
  );
}

function StatusChip({
  label,
  live,
  detail,
}: {
  label: string;
  live: boolean;
  detail: string;
}) {
  return (
    <div className="rp-flow-chip">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mute)]">
        {label}
      </span>
      <span className="mt-0.5 flex items-center gap-1.5">
        <Badge color={live ? "green" : "amber"}>{live ? "live" : "offline"}</Badge>
        <span className="font-mono text-[10px] text-[var(--ink-mute)]">
          {detail}
        </span>
      </span>
    </div>
  );
}
