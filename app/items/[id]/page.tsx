"use client";

import { useEffect, useState, use } from "react";
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

type Detail = {
  item: {
    id: number;
    title: string;
    category: string | null;
    urgency: string | null;
    jurisdiction: string | null;
    confidence: number | null;
    fast_path: boolean;
    status: string;
    source_text_redacted: string;
    created_at: string;
  };
  obligations: {
    owner: string;
    action: string;
    due_date: string;
    source_quote: string;
  }[];
  memo: string;
  modelUsed: string;
  confidence: { score: number | null; note: string; reasons?: string[] };
  grounding: {
    model?: string;
    overallSupported?: number;
    inventedClaims?: number;
    unsupportedCount?: number;
    softFail?: boolean;
    details?: string;
    obligations?: {
      index: number;
      owner: string;
      action: string;
      supportedNoul: number;
      supported: boolean;
    }[];
  } | null;
  provenance?: {
    policy_version: number | null;
    preset: string | null;
    judgments: {
      triage?: {
        model?: string;
        injectionNoul?: number;
        escalateNoul?: number;
        category?: { choice: string; confidence: number };
        urgency?: { choice: string; confidence: number };
        jurisdiction?: { choice: string; confidence: number };
      };
      grounding?: {
        overallSupported: number;
        inventedClaims: number;
        unsupportedCount: number;
        softFail?: boolean;
        obligations?: {
          index: number;
          owner: string;
          action: string;
          supportedNoul: number;
          supported: boolean;
        }[];
      };
      confidence?: { score: number; reasons: string[]; model?: string };
    } | null;
  } | null;
  playbook?: {
    id: string;
    framework: string;
    title: string;
    steps: string[];
  } | null;
  audit: {
    id: number;
    actor: string;
    action: string;
    detail: string | null;
    created_at: string;
  }[];
};

export default function ItemDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const itemId = Number(id);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function load() {
    const r = await fetch(`/api/detail?item_id=${itemId}`);
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "Failed to load");
    setData(d);
  }

  useEffect(() => {
    if (!itemId) {
      setError("Invalid item id");
      return;
    }
    load().catch((e) => setError((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  async function reanalyze() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Re-analyze failed");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: "approve" | "needs_work") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, decision, note }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Review failed");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return (
      <div>
        <PageHeader title="Item" subtitle={error} />
        <Link href="/" className="text-sm text-[var(--sky)] underline">
          Back to overview
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title={`Item #${itemId}`} subtitle="Loading package…" />
      </div>
    );
  }

  const { item } = data;
  const canReview = ["pending_review", "needs_work", "auto_approved"].includes(
    item.status
  );

  return (
    <div>
      <PageHeader
        title={item.title}
        subtitle={`#${item.id} · ${item.category || "Unclassified"} · ${
          item.jurisdiction || "—"
        }`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/export?item_id=${itemId}&format=md`}
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[var(--paper-2)]"
            >
              Export .md
            </a>
            <a
              href={`/api/export?item_id=${itemId}&format=json`}
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[var(--paper-2)]"
            >
              Export JSON
            </a>
            {item.status !== "blocked" && (
              <button
                onClick={reanalyze}
                disabled={busy}
                className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ink-2)] disabled:opacity-50"
              >
                {busy ? "Working…" : "Re-analyze"}
              </button>
            )}
          </div>
        }
      />

      {error && (
        <Card className="mb-4 border-[var(--coral)]/30 text-sm text-[var(--coral)]">
          {error}
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <StatusBadge status={item.status} />
        <UrgencyBadge urgency={item.urgency || "low"} />
        <ConfidenceBadge score={item.confidence} />
        <Badge color={item.fast_path ? "green" : "blue"}>
          {item.fast_path ? "fast path" : "full path"}
        </Badge>
        {data.modelUsed && <Badge color="slate">draft · {data.modelUsed}</Badge>}
        {data.provenance?.preset && (
          <Badge color="slate">preset · {data.provenance.preset}</Badge>
        )}
        {data.provenance?.policy_version != null && (
          <Badge color="slate">policy v{data.provenance.policy_version}</Badge>
        )}
        {data.grounding?.softFail && (
          <Badge color="amber">grounding soft-fail</Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <Card>
            <SectionTitle eyebrow="Obligations">
              Extracted ({data.obligations.length})
            </SectionTitle>
            {data.obligations.length === 0 ? (
              <p className="text-sm text-[var(--ink-mute)]">None yet — run analyze.</p>
            ) : (
              <ul className="space-y-2">
                {data.obligations.map((o, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3 text-sm"
                  >
                    <div className="font-semibold">{o.owner}</div>
                    <div className="mt-0.5">{o.action}</div>
                    <div className="mt-1 text-xs text-[var(--ink-mute)]">
                      Due {o.due_date} · “{o.source_quote}”
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionTitle eyebrow="Memo">Draft</SectionTitle>
            {data.memo ? (
              <div className="memo rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-4">
                <ReactMarkdown>{data.memo}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-[var(--ink-mute)]">No memo yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-5">
          {data.playbook && (
            <Card>
              <SectionTitle eyebrow={data.playbook.framework}>
                {data.playbook.title}
              </SectionTitle>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-[var(--ink-2)]">
                {data.playbook.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Card>
          )}

          {(data.provenance?.policy_version != null ||
            data.provenance?.preset ||
            data.provenance?.judgments) && (
            <Card>
              <SectionTitle eyebrow="Provenance">
                Policy + System One
              </SectionTitle>
              <div className="mb-3 flex flex-wrap gap-2">
                {data.provenance?.preset && (
                  <Badge color="blue">{data.provenance.preset}</Badge>
                )}
                {data.provenance?.policy_version != null && (
                  <Badge color="slate">
                    config v{data.provenance.policy_version}
                  </Badge>
                )}
              </div>
              {data.provenance?.judgments?.triage && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-[var(--paper-2)] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
                      Injection noul
                    </div>
                    <div className="font-display text-xl font-semibold">
                      {data.provenance.judgments.triage.injectionNoul != null
                        ? data.provenance.judgments.triage.injectionNoul.toFixed(
                            2
                          )
                        : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[var(--paper-2)] p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
                      Escalate noul
                    </div>
                    <div className="font-display text-xl font-semibold">
                      {data.provenance.judgments.triage.escalateNoul != null
                        ? data.provenance.judgments.triage.escalateNoul.toFixed(
                            2
                          )
                        : "—"}
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1 rounded-xl bg-[var(--paper-2)] p-3 text-xs text-[var(--ink-2)]">
                    <div>
                      Category{" "}
                      <span className="font-semibold">
                        {data.provenance.judgments.triage.category?.choice ||
                          "—"}
                      </span>
                      {data.provenance.judgments.triage.category?.confidence !=
                        null &&
                        ` · ${data.provenance.judgments.triage.category.confidence.toFixed(2)}`}
                    </div>
                    <div>
                      Urgency{" "}
                      <span className="font-semibold">
                        {data.provenance.judgments.triage.urgency?.choice || "—"}
                      </span>
                      {data.provenance.judgments.triage.urgency?.confidence !=
                        null &&
                        ` · ${data.provenance.judgments.triage.urgency.confidence.toFixed(2)}`}
                    </div>
                    <div>
                      Jurisdiction{" "}
                      <span className="font-semibold">
                        {data.provenance.judgments.triage.jurisdiction
                          ?.choice || "—"}
                      </span>
                      {data.provenance.judgments.triage.jurisdiction
                        ?.confidence != null &&
                        ` · ${data.provenance.judgments.triage.jurisdiction.confidence.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              )}
              {(data.provenance?.judgments?.grounding?.obligations?.length ||
                0) > 0 && (
                <ul className="mt-3 space-y-1.5 text-xs text-[var(--ink-2)]">
                  <li className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
                    Per-obligation grounding
                  </li>
                  {data.provenance!.judgments!.grounding!.obligations!.map(
                    (o) => (
                      <li
                        key={o.index}
                        className="flex items-start justify-between gap-2 border-b border-[var(--line)]/60 pb-1 last:border-0"
                      >
                        <span className="min-w-0 truncate">
                          {o.owner}: {o.action}
                        </span>
                        <Badge color={o.supported ? "green" : "amber"}>
                          {o.supportedNoul.toFixed(2)}
                        </Badge>
                      </li>
                    )
                  )}
                </ul>
              )}
            </Card>
          )}

          {data.grounding && (
            <Card>
              <SectionTitle eyebrow="TypeSafe">Grounding check</SectionTitle>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-[var(--paper-2)] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
                    Supported
                  </div>
                  <div className="font-display text-2xl font-semibold">
                    {data.grounding.overallSupported != null
                      ? data.grounding.overallSupported.toFixed(2)
                      : "—"}
                  </div>
                </div>
                <div className="rounded-xl bg-[var(--paper-2)] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
                    Unsupported
                  </div>
                  <div className="font-display text-2xl font-semibold">
                    {data.grounding.unsupportedCount ?? "—"}
                  </div>
                </div>
              </div>
              {data.grounding.details && (
                <p className="mt-2 text-xs text-[var(--ink-mute)]">
                  {data.grounding.details}
                </p>
              )}
            </Card>
          )}

          <Card>
            <SectionTitle eyebrow="Source">Redacted text</SectionTitle>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3 font-mono text-[11px] leading-relaxed text-[var(--ink-2)]">
              {item.source_text_redacted}
            </pre>
          </Card>

          <Card>
            <SectionTitle eyebrow="Audit">Decision trail</SectionTitle>
            <ul className="max-h-72 space-y-2 overflow-auto">
              {data.audit.map((a) => (
                <li key={a.id} className="border-b border-[var(--line)]/70 pb-2 text-xs last:border-0">
                  <div className="flex justify-between gap-2">
                    <Badge color="slate">{a.action}</Badge>
                    <span className="font-mono text-[10px] text-[var(--ink-mute)]">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[var(--ink-mute)]">{a.actor}</div>
                  {a.detail && (
                    <div className="mt-0.5 line-clamp-2 text-[var(--ink-2)]">
                      {a.detail}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          {canReview && (
            <Card>
              <SectionTitle eyebrow="Human">Decision</SectionTitle>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Reviewer note (optional)"
                className="mb-3 w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 text-sm outline-none ring-[var(--sage)] focus:ring-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => decide("approve")}
                  disabled={busy}
                  className="rounded-xl bg-[var(--sage)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide("needs_work")}
                  disabled={busy}
                  className="rounded-xl bg-[var(--coral)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Request changes
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
