"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Card,
  SectionTitle,
  Badge,
  StatusBadge,
  ConfidenceBadge,
  UrgencyBadge,
  PageHeader,
} from "@/components/ui";

type QueueItem = {
  id: number;
  title: string;
  category: string;
  urgency: string;
  jurisdiction: string;
  confidence: number;
  fast_path: boolean;
  status: string;
  created_at: string;
  obligation_count: string;
};

type Detail = {
  obligations: { owner: string; action: string; due_date: string; source_quote: string }[];
  memo: string;
  modelUsed: string;
  confidence: { score: number; reasons: string[] };
};

export default function ReviewQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const r = await fetch("/api/review");
    const d = await r.json();
    setItems(d.items || []);
  }

  useEffect(() => {
    load().catch(() => setError("Could not load queue."));
  }, []);

  async function select(it: QueueItem) {
    setSelected(it);
    setDetail(null);
    setNote("");
    const d2 = await fetch(`/api/detail?item_id=${it.id}`)
      .then((x) => x.json())
      .catch(() => null);
    if (d2 && !d2.error) setDetail(d2);
  }

  async function decide(decision: "approve" | "needs_work") {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: selected.id, decision, note }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Update failed");
      setSelected(null);
      setDetail(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Review"
        subtitle="Items the confidence gate held back. Approve or request changes — every decision is audited."
      />
      {error && (
        <Card className="mb-4 border-[var(--coral)]/30 text-sm text-[var(--coral)]">
          {error}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionTitle eyebrow="Queue">Needs a human ({items.length})</SectionTitle>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-2)] px-3 py-8 text-center text-sm text-[var(--ink-mute)]">
              Queue is clear.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => select(it)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selected?.id === it.id
                      ? "border-[var(--sage)] bg-[var(--sage-soft)]/40"
                      : "border-[var(--line)] bg-[var(--paper-2)] hover:border-[var(--sage)] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{it.title}</span>
                    <StatusBadge status={it.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge color="blue">{it.category}</Badge>
                    <UrgencyBadge urgency={it.urgency} />
                    <ConfidenceBadge score={it.confidence} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="lg:col-span-2">
          {!selected ? (
            <Card>
              <p className="text-sm text-[var(--ink-mute)]">
                Select an item to review its memo and obligations.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <SectionTitle eyebrow="Extracted">
                  Obligations ({detail ? detail.obligations.length : selected.obligation_count})
                </SectionTitle>
                {detail ? (
                  detail.obligations.length === 0 ? (
                    <p className="text-sm text-[var(--ink-mute)]">None extracted.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {detail.obligations.map((o, i) => (
                        <li
                          key={i}
                          className="rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3"
                        >
                          <span className="font-semibold">{o.owner}:</span> {o.action}{" "}
                          <span className="text-[var(--ink-mute)]">({o.due_date})</span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <p className="text-sm text-[var(--ink-mute)]">Loading…</p>
                )}
              </Card>
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <SectionTitle eyebrow="Draft">Memo</SectionTitle>
                  {detail && (
                    <span className="font-mono text-[11px] text-[var(--ink-mute)]">
                      {detail.modelUsed}
                    </span>
                  )}
                </div>
                {detail ? (
                  <div className="memo rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-4">
                    <ReactMarkdown>{detail.memo}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--ink-mute)]">Loading…</p>
                )}
              </Card>
              <Card>
                <SectionTitle eyebrow="Human">Your decision</SectionTitle>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Reviewer note (optional, saved to the audit log)"
                  className="mb-3 w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 text-sm outline-none ring-[var(--sage)] focus:ring-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => decide("approve")}
                    disabled={busy}
                    className="rounded-xl bg-[var(--sage)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d655e] disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Approve"}
                  </button>
                  <button
                    onClick={() => decide("needs_work")}
                    disabled={busy}
                    className="rounded-xl bg-[var(--coral)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#9f1515] disabled:opacity-50"
                  >
                    Request changes
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
