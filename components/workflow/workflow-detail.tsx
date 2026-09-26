"use client";

import Link from "next/link";
import { Badge, SectionTitle } from "@/components/ui";
import type { AgentConfig, WorkflowStep } from "@/lib/agents";
import { AGENT_PLAIN, type AgentKeyForPrimer } from "@/lib/jev-primer";
import { contractFor } from "@/lib/workflow-contracts";

const RUNTIME_COLOR: Record<
  WorkflowStep["runtime"],
  "green" | "blue" | "slate" | "amber"
> = {
  typesafe: "green",
  azure: "blue",
  rules: "slate",
  human: "amber",
  ui: "slate",
};

function runtimeColor(runtime: WorkflowStep["runtime"]) {
  switch (runtime) {
    case "typesafe":
    case "azure":
    case "rules":
    case "human":
    case "ui":
      return RUNTIME_COLOR[runtime];
    default: {
      const _exhaustive: never = runtime;
      return _exhaustive;
    }
  }
}

export function WorkflowDetailSheet({
  step,
  index,
  config,
  ready,
  onClose,
}: {
  step: WorkflowStep;
  index: number;
  config: AgentConfig | null;
  ready: boolean | null;
  onClose: () => void;
}) {
  const agentForStep =
    config && step.agentKey ? config[step.agentKey] : null;
  const contract = contractFor(step.id, config);

  return (
    <aside className="rp-flow-sheet" aria-label={`${step.title} details`}>
      <div className="flex items-start justify-between gap-3">
        <SectionTitle eyebrow={`Step ${index + 1}`}>{step.title}</SectionTitle>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[var(--line)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-mute)] hover:bg-[var(--paper-2)]"
        >
          Close
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge color={runtimeColor(step.runtime)}>{step.runtime}</Badge>
        {ready != null && (
          <Badge color={ready ? "green" : "amber"}>
            {ready ? "service ready" : "not configured"}
          </Badge>
        )}
      </div>

      <p className="text-sm leading-relaxed text-[var(--ink-2)]">{step.role}</p>

      <div className="mt-3 rounded-xl border border-[var(--sage)]/25 bg-[var(--sage-soft)]/40 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
          Why this block
        </div>
        <p className="mt-1 text-sm leading-relaxed text-[var(--ink)]">
          {contract.why}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-1">
        <div className="rounded-xl border border-[var(--line)] bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--sky)]">
            What goes in
          </div>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--ink-2)]">
            {contract.inputs.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--sage)]">
            What goes out
          </div>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--ink-2)]">
            {contract.outputs.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
          How the next block is picked
        </div>
        <p className="mt-1 text-sm leading-relaxed text-[var(--ink)]">
          {contract.nextHow}
        </p>
        <ul className="mt-3 space-y-2">
          {contract.branches.map((b) => (
            <li
              key={`${b.when}-${b.goesTo}`}
              className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-2"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge color="slate">{b.when}</Badge>
                <span className="text-xs font-semibold text-[var(--ink)]">
                  → {b.goesTo}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink-mute)]">
                {b.condition}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {step.runtime === "typesafe" && (
        <div className="mt-3 rounded-xl border border-[var(--sage)]/30 bg-[var(--sage-soft)]/50 p-3 text-xs leading-relaxed text-[var(--ink-2)]">
          <span className="font-semibold text-[var(--ink)]">Jev here: </span>
          answers typed yes/no (noul), label (Choice), or graded (Score)
          questions — it does not write the memo. Numbers feed routing, review,
          and the examiner package.
        </div>
      )}
      {step.runtime === "azure" && (
        <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3 text-xs leading-relaxed text-[var(--ink-2)]">
          <span className="font-semibold text-[var(--ink)]">Azure here: </span>
          drafts obligations and memo prose after the guardrail passes. Jev may
          still verify fields and dates around this step.
        </div>
      )}

      {step.agentKey && AGENT_PLAIN[step.agentKey as AgentKeyForPrimer] && (
        <div className="mt-3 rounded-xl border border-[var(--line)] bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
            What Jev / this step answers
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[var(--ink)]">
            {AGENT_PLAIN[step.agentKey as AgentKeyForPrimer].jevDoes}
          </p>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
          Real implementation
        </div>
        <code className="mt-1 block whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--ink)]">
          {step.implementation}
        </code>
      </div>

      {step.apis.length > 0 && (
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
      )}

      <div className="mt-5 border-t border-[var(--line)] pt-4">
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
              {step.agentKey === "guardrail" && config && (
                <Badge color="slate">
                  block if injection ≥{" "}
                  {config.guardrail.injectionBlockThreshold.toFixed(2)}
                </Badge>
              )}
              {step.agentKey === "triage" && config && (
                <Badge color="slate">
                  full path if escalate ≥{" "}
                  {config.triage.escalateFullPathThreshold.toFixed(2)}
                </Badge>
              )}
              {step.agentKey === "grounding" && config && (
                <Badge color="slate">
                  soft-fail if support &lt;{" "}
                  {config.grounding.supportThreshold.toFixed(2)}
                </Badge>
              )}
              {step.agentKey === "gate" && config && (
                <Badge color="slate">
                  auto-approve if score ≥{" "}
                  {config.gate.autoApproveAbove.toFixed(2)}
                </Badge>
              )}
            </div>
            <Link
              href="/agents"
              className="mt-4 inline-block text-xs font-semibold text-[var(--sky)] hover:underline"
            >
              Edit thresholds & Jev glossary →
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
              {step.id === "eval" &&
                "Replay labeled samples to calibrate thresholds without writing production decisions."}
              {step.id === "blocked" &&
                "Guardrail stopped this item. Nothing was sent to Azure; the audit trail records the block reason."}
              {step.id === "fastpath" &&
                "Router skipped the heavy draft path. The item still hits confidence + gate with triage judgments."}
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
              {step.id === "eval" && (
                <Link
                  href="/settings"
                  className="rounded-lg bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-white"
                >
                  Open settings
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
