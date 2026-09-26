"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Card,
  SectionTitle,
  Badge,
} from "@/components/ui";

export type FindDisposition = "answered" | "partial" | "absent";

export type LineFindHit = {
  id: string;
  index: number;
  text: string;
  relevance: number;
};

export type LineFindResult = {
  query: string;
  existsNoul: number;
  disposition: FindDisposition;
  dispositionLabel: string;
  lineCount: number;
  hits: LineFindHit[];
  model: string;
  latencyMs: number;
  windowed?: boolean;
};

function dispositionColor(
  d: FindDisposition
): "green" | "amber" | "slate" | "red" {
  switch (d) {
    case "answered":
      return "green";
    case "partial":
      return "amber";
    case "absent":
      return "slate";
    default: {
      const _exhaustive: never = d;
      return _exhaustive;
    }
  }
}

type Props = {
  itemId: number;
  /** Called when the operator clicks a hit — scroll/highlight source. */
  onSelectLine?: (hit: LineFindHit) => void;
  /** Compact mode for Review sidebar. */
  compact?: boolean;
  className?: string;
};

export function LineFindPanel({
  itemId,
  onSelectLine,
  compact = false,
  className = "",
}: Props) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LineFindResult | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#line-find") {
      inputRef.current?.focus();
    }
  }, []);

  async function runFind(e?: FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      setError("Ask a question about the source.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    setActiveId(null);
    try {
      const r = await fetch("/api/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, query: q }),
      });
      const d = await r.json();
      if (!r.ok) {
        throw new Error(d.error || "Line-find failed");
      }
      setResult(d as LineFindResult);
      if (d.hits?.[0]) {
        setActiveId(d.hits[0].id);
        onSelectLine?.(d.hits[0]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function pickHit(hit: LineFindHit) {
    setActiveId(hit.id);
    onSelectLine?.(hit);
  }

  return (
    <div id="line-find" className={className}>
    <Card>
      <SectionTitle eyebrow="Examiner">
        {compact ? "Line-find" : "Where does the source answer…?"}
      </SectionTitle>
      {!compact && (
        <p className="mb-3 text-xs leading-relaxed text-[var(--ink-mute)]">
          TypeSafe Noul checks whether an answer exists; Choice ranks line IDs
          in the redacted source. Results are ephemeral (audit:{" "}
          <span className="font-mono">source.find</span>).
        </p>
      )}
      <form onSubmit={runFind} className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "who owns the SAR filing deadline?"'
          className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 text-sm outline-none ring-[var(--sage)] focus:ring-2"
          disabled={busy}
          maxLength={500}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ink-2)] disabled:opacity-50"
        >
          {busy ? "Finding…" : "Find"}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-[var(--coral)]">{error}</p>
      )}
      {result && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={dispositionColor(result.disposition)}>
              {result.dispositionLabel}
            </Badge>
            <Badge color="slate">
              exists {result.existsNoul.toFixed(2)}
            </Badge>
            <span className="font-mono text-[10px] text-[var(--ink-mute)]">
              {result.lineCount} lines · {result.latencyMs}ms
              {result.windowed ? " · windowed" : ""}
            </span>
          </div>
          <ul className="space-y-1.5">
            {result.hits.map((h) => {
              const active = activeId === h.id;
              const bar = Math.max(1, Math.round(h.relevance * 12));
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => pickHit(h)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                      active
                        ? "border-[var(--sage)] bg-[var(--sage-soft)]"
                        : "border-[var(--line)] bg-[var(--paper-2)] hover:border-[var(--sage)]/50"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-[var(--sage)]">
                        {h.id}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--ink-mute)]">
                        {h.relevance.toFixed(2)}{" "}
                        <span aria-hidden>{"#".repeat(bar)}</span>
                      </span>
                    </div>
                    <div
                      className={`mt-0.5 text-[var(--ink-2)] ${
                        compact ? "line-clamp-2" : "line-clamp-3"
                      }`}
                    >
                      {h.text || (
                        <span className="text-[var(--ink-mute)]">(empty)</span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
    </div>
  );
}
