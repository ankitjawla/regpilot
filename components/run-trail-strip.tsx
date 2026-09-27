"use client";

import Link from "next/link";
import type { RunTrail, TrailStage } from "@/lib/run-trail";
import type { StageState } from "@/lib/pipeline-events";

function chipClass(state: StageState): string {
  switch (state) {
    case "running":
      return "bg-[var(--sage)] text-white";
    case "done":
      return "bg-[var(--sage-soft)] text-[var(--sage)]";
    case "blocked":
      return "bg-[var(--coral)]/15 text-[var(--coral)]";
    case "skipped":
      return "bg-[var(--paper-2)] text-[var(--ink-mute)] line-through";
    case "pending":
      return "bg-[var(--paper-2)] text-[var(--ink-mute)]";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function label(stage: TrailStage): string {
  if (
    stage.detail &&
    (stage.state === "done" || stage.state === "blocked" || stage.state === "skipped")
  ) {
    const short =
      stage.detail.length > 36 ? `${stage.detail.slice(0, 35)}…` : stage.detail;
    return `${stage.id} · ${short}`;
  }
  return stage.id;
}

export function RunTrailStrip({
  trail,
  itemId,
}: {
  trail: RunTrail | null;
  itemId: number;
}) {
  if (!trail) return null;
  return (
    <div className="mb-4 rounded-[var(--radius)] border border-[var(--line)] bg-white px-4 py-3 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-mute)]">
          Saved run
        </div>
        <Link
          href={`/workflow?item=${itemId}`}
          className="text-xs font-semibold text-[var(--sky)] hover:underline"
        >
          Open on workflow
        </Link>
      </div>
      <ol className="mt-2 flex flex-wrap gap-1.5">
        {trail.stages.map((stage) => (
          <li
            key={stage.id}
            title={stage.detail || stage.state}
            className={`rounded-md px-2 py-1 font-mono text-[10px] font-semibold ${chipClass(stage.state)}`}
          >
            {label(stage)}
          </li>
        ))}
      </ol>
    </div>
  );
}
