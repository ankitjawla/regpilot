"use client";

import { useState } from "react";
import { Card, SectionTitle, Badge } from "@/components/ui";
import {
  AGENT_PLAIN,
  JEV_PRIMER,
  type AgentKeyForPrimer,
} from "@/lib/jev-primer";

export function JevPrimerCard({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(!compact);

  return (
    <Card className="border-[var(--sage)]/25 bg-[linear-gradient(135deg,var(--sage-soft)_0%,var(--paper)_55%)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle eyebrow="TypeSafe · Jev">{JEV_PRIMER.title}</SectionTitle>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--ink-2)]">
            {JEV_PRIMER.lead}
          </p>
        </div>
        {compact && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--paper-2)]"
          >
            {open ? "Hide glossary" : "Show glossary"}
          </button>
        )}
      </div>

      {open && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {JEV_PRIMER.primitives.map((p) => (
              <div
                key={p.name}
                className="rounded-xl border border-[var(--line)] bg-white/80 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--ink)]">
                    {p.name}
                  </span>
                  <Badge color="green">{p.plain}</Badge>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-2)]">
                  {p.detail}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[var(--ink-mute)]">
            {JEV_PRIMER.vsAzure}
          </p>
        </>
      )}
    </Card>
  );
}

export function AgentPlainEnglish({ agentKey }: { agentKey: AgentKeyForPrimer }) {
  const copy = AGENT_PLAIN[agentKey];
  return (
    <Card>
      <SectionTitle eyebrow="In plain English">What this step does</SectionTitle>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
        {copy.summary}
      </p>
      <dl className="mt-4 space-y-3">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
            What Jev answers here
          </dt>
          <dd className="mt-1 text-sm leading-relaxed text-[var(--ink)]">
            {copy.jevDoes}
          </dd>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
            What your sliders mean
          </dt>
          <dd className="mt-1 text-sm leading-relaxed text-[var(--ink)]">
            {copy.youControl}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
