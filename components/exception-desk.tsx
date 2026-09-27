"use client";

import { Badge, Card, SectionTitle } from "@/components/ui";
import type { ExceptionKind, GateException } from "@/lib/exceptions";

function kindLabel(kind: ExceptionKind): string {
  switch (kind) {
    case "grounding":
      return "Grounding";
    case "playbook":
      return "Playbook";
    case "hazard":
      return "Hazard";
    case "due_date":
      return "Due date";
    case "uncertain":
      return "Uncertain";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function ExceptionDesk({
  exceptions,
  onFind,
}: {
  exceptions: GateException[];
  onFind?: (quote: string) => void;
}) {
  return (
    <Card>
      <SectionTitle eyebrow="Why it stopped">
        {exceptions.length === 0
          ? "No exceptions"
          : `${exceptions.length} exception${exceptions.length === 1 ? "" : "s"}`}
      </SectionTitle>
      {exceptions.length === 0 ? (
        <p className="text-sm text-[var(--ink-2)]">
          Grounding, playbook, hazard, due dates, and uncertain bands did not
          flag this item.
        </p>
      ) : (
        <ul className="space-y-2">
          {exceptions.map((ex) => (
            <li
              key={ex.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge color={ex.severity === "block" ? "red" : "amber"}>
                  {ex.severity}
                </Badge>
                <Badge color="slate">{kindLabel(ex.kind)}</Badge>
                <span className="text-sm font-semibold text-[var(--ink)]">
                  {ex.title}
                </span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-2)]">
                {ex.detail}
              </p>
              {ex.quote && (
                <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-xs leading-relaxed text-[var(--ink-mute)]">
                    “{ex.quote}”
                  </p>
                  {onFind && (
                    <button
                      type="button"
                      onClick={() => onFind(ex.quote!)}
                      className="shrink-0 rounded-lg border border-[var(--line)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--sky)]"
                    >
                      Find in source
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
