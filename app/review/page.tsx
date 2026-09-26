"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  grounding?: {
    overallSupported?: number;
    unsupportedCount?: number;
    details?: string;
  } | null;
};

export default function ReviewQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  async function load() {
    const r = await fetch("/api/review");
    const d = await r.json();
    setItems(d.items || []);
  }

  useEffect(() => {
    load().catch(() => setError("Could not load queue."));
  }, []);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (urgencyFilter !== "all" && it.urgency !== urgencyFilter) return false;
      if (statusFilter !== "all" && it.status !== statusFilter) return false;
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      if (
        q &&
        !`${it.title} ${it.category} ${it.jurisdiction} #${it.id}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [items, urgencyFilter, statusFilter, categoryFilter, search]);

  async function select(it: QueueItem) {
    setSelected(it);
    setDetail(null);
    setNote("");
    const d2 = await fetch(`/api/detail?item_id=${it.id}`)
      .then((x) => x.json())
      .catch(() => null);
    if (d2 && !d2.error) setDetail(d2);
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  async function bulkApprove() {
    if (selectedIds.size === 0) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: [...selectedIds],
          decision: "approve",
          note: "Bulk approve from review queue",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Bulk approve failed");
      setSelectedIds(new Set());
      setSelected(null);
      setDetail(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reanalyzeSelected() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: selected.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Re-analyze failed");
      await select(selected);
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
        subtitle="Items the confidence gate held back. Filter, bulk-approve, re-analyze, or export from the item page."
        actions={
          selectedIds.size > 0 ? (
            <button
              onClick={bulkApprove}
              disabled={busy}
              className="rounded-xl bg-[var(--sage)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Approve selected ({selectedIds.size})
            </button>
          ) : undefined
        }
      />
      {error && (
        <Card className="mb-4 border-[var(--coral)]/30 text-sm text-[var(--coral)]">
          {error}
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, category, id…"
          className="min-w-[14rem] flex-1 rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2 text-sm outline-none ring-[var(--sage)] focus:ring-2 sm:max-w-xs"
        />
        {["all", "critical", "high", "medium", "low"].map((u) => (
          <button
            key={u}
            onClick={() => setUrgencyFilter(u)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              urgencyFilter === u
                ? "bg-[var(--ink)] text-white"
                : "bg-[var(--paper-2)] text-[var(--ink-mute)]"
            }`}
          >
            {u === "all" ? "All urgency" : u}
          </button>
        ))}
        {["all", "pending_review", "needs_work"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              statusFilter === s
                ? "bg-[var(--ink)] text-white"
                : "bg-[var(--paper-2)] text-[var(--ink-mute)]"
            }`}
          >
            {s === "all" ? "All status" : s.replace("_", " ")}
          </button>
        ))}
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-[var(--line)] bg-[var(--paper-2)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionTitle eyebrow="Queue">
            Needs a human ({filtered.length})
          </SectionTitle>
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-2)] px-3 py-8 text-center text-sm text-[var(--ink-mute)]">
              Queue is clear for this filter.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((it) => (
                <div
                  key={it.id}
                  className={`rounded-xl border p-3 transition ${
                    selected?.id === it.id
                      ? "border-[var(--sage)] bg-[var(--sage-soft)]/40"
                      : "border-[var(--line)] bg-[var(--paper-2)]"
                  }`}
                >
                  <div className="mb-1.5 flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(it.id)}
                      onChange={() => toggleSelect(it.id)}
                      className="mt-1"
                      aria-label={`Select ${it.title}`}
                    />
                    <button
                      onClick={() => select(it)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {it.title}
                        </span>
                        <StatusBadge status={it.status} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Badge color="blue">{it.category}</Badge>
                        <UrgencyBadge urgency={it.urgency} />
                        <ConfidenceBadge score={it.confidence} />
                      </div>
                    </button>
                  </div>
                  <Link
                    href={`/items/${it.id}`}
                    className="ml-6 text-[11px] font-semibold text-[var(--sky)] hover:underline"
                  >
                    Open package →
                  </Link>
                </div>
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
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <SectionTitle eyebrow="Extracted">
                    Obligations (
                    {detail ? detail.obligations.length : selected.obligation_count})
                  </SectionTitle>
                  <div className="flex gap-2">
                    <button
                      onClick={reanalyzeSelected}
                      disabled={busy}
                      className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    >
                      Re-analyze
                    </button>
                    <Link
                      href={`/items/${selected.id}`}
                      className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold"
                    >
                      Full package
                    </Link>
                  </div>
                </div>
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
              {detail?.grounding && (
                <Card>
                  <SectionTitle eyebrow="TypeSafe">Grounding</SectionTitle>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge color="green">
                      supported{" "}
                      {detail.grounding.overallSupported != null
                        ? detail.grounding.overallSupported.toFixed(2)
                        : "—"}
                    </Badge>
                    <Badge
                      color={
                        (detail.grounding.unsupportedCount || 0) > 0
                          ? "amber"
                          : "slate"
                      }
                    >
                      unsupported {detail.grounding.unsupportedCount ?? 0}
                    </Badge>
                  </div>
                </Card>
              )}
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
