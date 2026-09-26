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

  // Pulse walks the branched path (happy path + verify fan-out + branches).
  useEffect(() => {
    if (!steps.length) return;
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
  }, [steps]);

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
              Live flow
            </h2>
            <p className="mt-1 max-w-xl text-xs text-[var(--ink-mute)]">
              Branched DAG: block / pass, fast vs full draft, parallel Jev
              verify, then gate. Pan and zoom; click a node for details.
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
                liveId={liveId}
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
