"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  SectionTitle,
  Badge,
  PageHeader,
} from "@/components/ui";
import type { AgentConfig, WorkflowStep } from "@/lib/agents";

type Health = {
  ok?: boolean;
  services?: {
    typesafe?: { configured?: boolean; model?: string };
    azureOpenAI?: { configured?: boolean; deployment?: string; smallDeployment?: string };
    database?: { configured?: boolean };
  };
};

const RUNTIME_COLOR: Record<
  WorkflowStep["runtime"],
  "green" | "blue" | "slate" | "amber" | "red"
> = {
  typesafe: "green",
  azure: "blue",
  rules: "slate",
  human: "amber",
  ui: "slate",
};

export default function WorkflowPage() {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [active, setActive] = useState(0);
  const [liveId, setLiveId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/agents").then((r) => r.json()),
      fetch("/api/health").then((r) => r.json()),
    ])
      .then(([agents, h]) => {
        if (cancelled) return;
        setSteps(agents.workflow || []);
        setConfig(agents.config);
        setHealth(h);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load workflow catalog.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pulse animation along the pipeline to show “live” flow.
  useEffect(() => {
    if (!steps.length) return;
    const id = window.setInterval(() => {
      setLiveId((prev) => {
        const next = prev == null ? 0 : prev + 1;
        return next >= steps.length ? 0 : next;
      });
    }, 1600);
    return () => window.clearInterval(id);
  }, [steps.length]);

  const step = steps[active];

  const agentForStep = useMemo(() => {
    if (!config || !step?.agentKey) return null;
    return config[step.agentKey];
  }, [config, step]);

  function runtimeReady(runtime: WorkflowStep["runtime"]): boolean | null {
    if (!health) return null;
    if (runtime === "typesafe")
      return Boolean(health.services?.typesafe?.configured);
    if (runtime === "azure")
      return Boolean(health.services?.azureOpenAI?.configured);
    if (runtime === "rules" || runtime === "ui" || runtime === "human")
      return Boolean(health.services?.database?.configured ?? true);
    return null;
  }

  return (
    <div>
      <PageHeader
        title="Workflow"
        subtitle="End-to-end map of RegPilot — each node points at the real implementation that runs in production."
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
        <Card className="mb-4 border-[var(--coral)]/30 text-sm text-[var(--coral)]">
          {error}
        </Card>
      )}

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
            TypeSafe System One
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              color={health?.services?.typesafe?.configured ? "green" : "amber"}
            >
              {health?.services?.typesafe?.configured ? "live" : "offline"}
            </Badge>
            <span className="font-mono text-xs text-[var(--ink-mute)]">
              {health?.services?.typesafe?.model || "—"}
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--ink-mute)]">
            Guardrail · triage · grounding · confidence
          </p>
        </Card>
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
            Azure OpenAI
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              color={
                health?.services?.azureOpenAI?.configured ? "blue" : "amber"
              }
            >
              {health?.services?.azureOpenAI?.configured ? "live" : "offline"}
            </Badge>
            <span className="font-mono text-xs text-[var(--ink-mute)]">
              {health?.services?.azureOpenAI?.deployment || "—"}
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--ink-mute)]">
            Obligations JSON · memo draft (fast/full path)
          </p>
        </Card>
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
            Neon audit ledger
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              color={health?.services?.database?.configured ? "green" : "amber"}
            >
              {health?.services?.database?.configured ? "live" : "offline"}
            </Badge>
            <span className="font-mono text-xs text-[var(--ink-mute)]">
              regpilot_*
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--ink-mute)]">
            Items · obligations · drafts · audit · agent config
          </p>
        </Card>
      </section>

      <Card className="mb-5 overflow-hidden">
        <SectionTitle eyebrow="Pipeline">Live flow</SectionTitle>
        <p className="mb-4 text-xs text-[var(--ink-mute)]">
          Pulse travels the real path. Click a node for implementation details and
          current agent policy.
        </p>
        <div className="rp-workflow-track">
          {steps.map((s, i) => {
            const ready = runtimeReady(s.runtime);
            const isLive = liveId === i;
            const isActive = active === i;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(i)}
                className={`rp-workflow-node ${isActive ? "is-active" : ""} ${
                  isLive ? "is-pulse" : ""
                }`}
              >
                <span className="rp-workflow-index">{i + 1}</span>
                <span className="rp-workflow-title">{s.title}</span>
                <span className="rp-workflow-meta">
                  <Badge color={RUNTIME_COLOR[s.runtime]}>{s.runtime}</Badge>
                  {ready != null && (
                    <span
                      className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${
                        ready ? "bg-[var(--sage)]" : "bg-[var(--amber)]"
                      }`}
                    />
                  )}
                </span>
                {i < steps.length - 1 && (
                  <span className="rp-workflow-arrow" aria-hidden>
                    →
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {step && (
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <SectionTitle eyebrow={`Step ${active + 1}`}>{step.title}</SectionTitle>
            <p className="mt-1 text-sm leading-relaxed text-[var(--ink-2)]">
              {step.role}
            </p>
            <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
                Real implementation
              </div>
              <code className="mt-1 block whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--ink)]">
                {step.implementation}
              </code>
            </div>
            <div className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
                APIs
              </div>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {step.apis.map((a) => (
                  <li key={a}>
                    <Badge color="slate">{a}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="lg:col-span-5">
            <SectionTitle eyebrow="Policy">
              {agentForStep ? agentForStep.label : "Operator step"}
            </SectionTitle>
            {agentForStep ? (
              <>
                <p className="text-sm text-[var(--ink-2)]">
                  {agentForStep.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge color={agentForStep.enabled ? "green" : "amber"}>
                    {agentForStep.enabled ? "enabled" : "disabled"}
                  </Badge>
                  {step.agentKey === "guardrail" && (
                    <Badge color="slate">
                      inject ≥ {config!.guardrail.injectionBlockThreshold.toFixed(2)}
                    </Badge>
                  )}
                  {step.agentKey === "triage" && (
                    <Badge color="slate">
                      escalate ≥{" "}
                      {config!.triage.escalateFullPathThreshold.toFixed(2)}
                    </Badge>
                  )}
                  {step.agentKey === "grounding" && (
                    <Badge color="slate">
                      support &lt; {config!.grounding.supportThreshold.toFixed(2)}
                    </Badge>
                  )}
                  {step.agentKey === "gate" && (
                    <Badge color="slate">
                      auto &gt; {config!.gate.autoApproveAbove.toFixed(2)}
                    </Badge>
                  )}
                </div>
                <Link
                  href="/agents"
                  className="mt-4 inline-block text-xs font-semibold text-[var(--sky)] hover:underline"
                >
                  Edit this agent →
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-[var(--ink-2)]">
                  {step.id === "intake" &&
                    "Load a CCAR, COREP, FINREP, Call Report, or Dodd-Frank sample and run the full pipeline."}
                  {step.id === "human" &&
                    "Review queue supports filters, bulk approve, and re-analyze against the same agents."}
                  {step.id === "export" &&
                    "Examiner packages include memo, obligations, grounding, redacted source, and audit trail."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {step.id === "intake" && (
                    <Link
                      href="/intake"
                      className="rounded-lg bg-[var(--sage)] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Go to intake
                    </Link>
                  )}
                  {step.id === "human" && (
                    <Link
                      href="/review"
                      className="rounded-lg bg-[var(--sage)] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Go to review
                    </Link>
                  )}
                  {step.id === "export" && (
                    <Link
                      href="/"
                      className="rounded-lg bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-white"
                    >
                      Open overview
                    </Link>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      <Card className="mt-5">
        <SectionTitle eyebrow="Sequence">How a real request moves</SectionTitle>
        <ol className="mt-3 space-y-2 text-sm text-[var(--ink-2)]">
          <li>
            1. Operator submits text →{" "}
            <code className="font-mono text-xs">POST /api/pipeline</code> (or
            triage then analyze).
          </li>
          <li>
            2.{" "}
            <code className="font-mono text-xs">jevGuardrail</code> redacts PII,
            TypeSafe scores injection noul against the Agents threshold.
          </li>
          <li>
            3.{" "}
            <code className="font-mono text-xs">jevClassify</code> +{" "}
            <code className="font-mono text-xs">routeDecision</code> pick fast vs
            full path using escalate / confidence policy.
          </li>
          <li>
            4. Azure extracts obligations and drafts the memo; TypeSafe grounds
            claims and scores confidence.
          </li>
          <li>
            5.{" "}
            <code className="font-mono text-xs">gateDecision</code> writes status
            to Neon; humans clear via Review or{" "}
            <code className="font-mono text-xs">/items/[id]</code>.
          </li>
        </ol>
      </Card>
    </div>
  );
}
