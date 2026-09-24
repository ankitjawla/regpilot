"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Card, SectionTitle, Badge, StatusBadge, ConfidenceBadge, UrgencyBadge } from "@/components/ui";

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
    const d2 = await fetch(`/api/detail?item_id=${it.id}`).then((x) => x.json()).catch(() => null);
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
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Review queue</h1>
      <p className="mb-6 text-sm text-stone-500">
        Items the confidence gate held back. Approve or request changes — every decision is audited.
      </p>
      {error && <Card className="mb-4 border-red-200 text-sm text-red-700">{error}</Card>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionTitle>Needs a human ({items.length})</SectionTitle>
          {items.length === 0 ? (
            <p className="text-sm text-stone-500">Queue is clear.</p>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => select(it)}
                  className={`w-full rounded-lg border p-3 text-left ${
                    selected?.id === it.id ? "border-blue-500 bg-blue-50/50" : "border-stone-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{it.title}</span>
                    <StatusBadge status={it.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
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
            <Card><p className="text-sm text-stone-500">Select an item to review its memo and obligations.</p></Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <SectionTitle>Obligations ({detail ? detail.obligations.length : selected.obligation_count})</SectionTitle>
                {detail ? (
                  detail.obligations.length === 0 ? (
                    <p className="text-sm text-stone-500">None extracted.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {detail.obligations.map((o, i) => (
                        <li key={i} className="rounded-lg bg-stone-50 p-3">
                          <span className="font-semibold">{o.owner}:</span> {o.action}{" "}
                          <span className="text-stone-500">({o.due_date})</span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <p className="text-sm text-stone-500">Loading…</p>
                )}
              </Card>
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <SectionTitle>Draft memo</SectionTitle>
                  {detail && <span className="font-mono text-[11px] text-stone-400">{detail.modelUsed}</span>}
                </div>
                {detail ? (
                  <div className="memo"><ReactMarkdown>{detail.memo}</ReactMarkdown></div>
                ) : (
                  <p className="text-sm text-stone-500">Loading…</p>
                )}
              </Card>
              <Card>
                <SectionTitle>Your decision</SectionTitle>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Reviewer note (optional, saved to the audit log)"
                  className="mb-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => decide("approve")}
                    disabled={busy}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Approve"}
                  </button>
                  <button
                    onClick={() => decide("needs_work")}
                    disabled={busy}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
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
