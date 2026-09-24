"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  SectionTitle,
  Stat,
  StatusBadge,
  ConfidenceBadge,
  UrgencyBadge,
  Badge,
  PageHeader,
} from "@/components/ui";

type JevMeta = {
  version: string;
  primary?: string;
  typesafe?: { configured: boolean; model: string; endpoint: string };
  local?: {
    version?: string;
    tasks?: Record<
      string,
      { accuracy: number; n_train: number; n_holdout: number; classes: string[] }
    >;
  };
  tasks?: Record<
    string,
    { accuracy: number; n_train: number; n_holdout: number; classes: string[] }
  >;
};

type Stats = {
  total: number;
  fastPathPct: number;
  avgConfidence: number | null;
  pendingCount: number;
  blockedCount: number;
  autoApprovedCount: number;
  approvedCount: number;
  criticalCount: number;
  byCategory: { category: string; n: string }[];
  byStatus: { status: string; n: string }[];
  recent: {
    id: number;
    title: string;
    category: string;
    urgency: string;
    jurisdiction: string;
    confidence: number | null;
    fast_path: boolean;
    status: string;
    created_at: string;
  }[];
  needsYou: {
    id: number;
    title: string;
    category: string;
    urgency: string;
    confidence: number;
    status: string;
    created_at: string;
    obligation_count: string;
  }[];
  audit: {
    id: number;
    item_id: number | null;
    title: string | null;
    actor: string;
    action: string;
    detail: string | null;
    created_at: string;
  }[];
};

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [jevMeta, setJevMeta] = useState<JevMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) {
          setError(d.error);
          setStats({
            total: 0,
            fastPathPct: 0,
            avgConfidence: null,
            pendingCount: 0,
            blockedCount: 0,
            autoApprovedCount: 0,
            approvedCount: 0,
            criticalCount: 0,
            byCategory: [],
            byStatus: [],
            recent: [],
            needsYou: [],
            audit: [],
          });
        } else {
          setStats(d);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load dashboard.");
      });
    fetch("/api/jevmeta")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setJevMeta(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const catMax = useMemo(() => {
    if (!stats?.byCategory?.length) return 1;
    return Math.max(...stats.byCategory.map((c) => Number(c.n) || 0), 1);
  }, [stats]);

  const cleared =
    (stats?.autoApprovedCount || 0) + (stats?.approvedCount || 0);

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="TypeSafe System One triages and scores. Azure OpenAI drafts. Humans clear what the confidence gate holds back."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/review"
              className="inline-flex items-center rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper-2)]"
            >
              Review queue
              {stats && stats.pendingCount > 0 && (
                <span className="ml-2 rounded-md bg-[var(--amber-soft)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--amber)]">
                  {stats.pendingCount}
                </span>
              )}
            </Link>
            <Link
              href="/intake"
              className="inline-flex items-center rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ink-2)]"
            >
              New intake
            </Link>
          </div>
        }
      />

      {error && (
        <Card className="mb-4 border-[var(--coral)]/30 text-sm text-[var(--coral)]">
          {error}
        </Card>
      )}

      <section className="rp-rise mb-5">
        <div className="rp-pipeline">
          {[
            { t: "Guardrail", d: "PII + injection" },
            { t: "Triage", d: "TypeSafe choices" },
            { t: "Draft", d: "Azure memo" },
            { t: "Gate", d: "Human or auto" },
          ].map((s) => (
            <div key={s.t} className="rp-pipeline-step">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
                {s.t}
              </div>
              <div className="mt-0.5 text-sm font-semibold text-[var(--ink)]">
                {s.d}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rp-rise-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Needs you"
          value={stats ? stats.pendingCount : "—"}
          sub="pending review or rework"
          accent="amber"
          alert={Boolean(stats && stats.pendingCount > 0)}
        />
        <Stat
          label="Blocked"
          value={stats ? stats.blockedCount : "—"}
          sub="injection / guardrail"
          accent="coral"
        />
        <Stat
          label="Fast path"
          value={stats ? `${stats.fastPathPct}%` : "—"}
          sub="routine high-confidence"
          accent="sage"
        />
        <Stat
          label="Avg confidence"
          value={
            stats && stats.avgConfidence != null
              ? stats.avgConfidence.toFixed(2)
              : "—"
          }
          sub={`${cleared} cleared · ${stats?.total ?? 0} total`}
          accent="sky"
        />
      </section>

      <section className="rp-rise-3 mt-5 grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <SectionTitle eyebrow="System One">AI decision layer</SectionTitle>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge color={jevMeta?.typesafe?.configured ? "green" : "amber"}>
              {jevMeta?.typesafe?.configured
                ? `Live · ${jevMeta.typesafe.model}`
                : "Fallback mode"}
            </Badge>
            {stats && stats.criticalCount > 0 && (
              <Badge color="red">{stats.criticalCount} critical</Badge>
            )}
          </div>
          <p className="text-sm leading-relaxed text-[var(--ink-mute)]">
            {jevMeta?.typesafe?.configured ? (
              <>
                Jev returns typed judgments — category, urgency, jurisdiction,
                injection and escalate nouls — so the router can act without
                parsing free text. Azure only writes obligations and memos.
              </>
            ) : (
              <>
                TypeSafe is not configured. Local classifiers and Azure small
                deployment handle decisions until <code>TYPESAFE_API_KEY</code>{" "}
                is set.
              </>
            )}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {(
              jevMeta?.local?.tasks ||
              jevMeta?.tasks ||
              {}
            ) &&
              Object.entries(jevMeta?.local?.tasks || jevMeta?.tasks || {})
                .slice(0, 4)
                .map(([task, t]) => (
                  <div
                    key={task}
                    className="rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
                      {task}
                    </div>
                    <div className="font-display mt-0.5 text-xl font-semibold">
                      {(t.accuracy * 100).toFixed(0)}%
                    </div>
                    <div className="text-[11px] text-[var(--ink-mute)]">
                      local holdout
                    </div>
                  </div>
                ))}
          </div>

          <div className="mt-4 rounded-xl border border-[var(--line)] bg-gradient-to-br from-[#f3fbf9] to-[#eef5fb] p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
              Routing policy
            </div>
            <ul className="mt-2 space-y-1.5 text-xs text-[var(--ink-2)]">
              <li>Critical urgency → full Azure analysis</li>
              <li>Escalate noul ≥ 0.75 on non-routine → full path</li>
              <li>High-conf routine Consumer/Ops → fast path</li>
              <li>Confidence &gt; 0.90 → auto-approve</li>
            </ul>
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <SectionTitle eyebrow="Mix">By category</SectionTitle>
          {!stats ? (
            <p className="text-sm text-[var(--ink-mute)]">Loading…</p>
          ) : stats.byCategory.length === 0 ? (
            <p className="text-sm text-[var(--ink-mute)]">No triage data yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.byCategory.map((c) => {
                const n = Number(c.n) || 0;
                const pct = Math.round((n / catMax) * 100);
                return (
                  <li key={c.category}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-[var(--ink)]">
                        {c.category}
                      </span>
                      <span className="font-mono text-xs text-[var(--ink-mute)]">
                        {n}
                      </span>
                    </div>
                    <div className="rp-bar">
                      <span style={{ width: `${Math.max(pct, 8)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-3">
          <SectionTitle eyebrow="Ledger">Live audit</SectionTitle>
          {!stats ? (
            <p className="text-sm text-[var(--ink-mute)]">Loading…</p>
          ) : stats.audit.length === 0 ? (
            <p className="text-sm text-[var(--ink-mute)]">
              Decisions will stream here as intakes run.
            </p>
          ) : (
            <ul className="space-y-3">
              {stats.audit.slice(0, 7).map((e) => (
                <li key={e.id} className="border-b border-[var(--line)] pb-2 last:border-0">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      color={
                        e.actor === "human"
                          ? "green"
                          : e.action.includes("block")
                            ? "red"
                            : e.actor === "router" || e.actor === "gate"
                              ? "blue"
                              : "slate"
                      }
                    >
                      {e.action}
                    </Badge>
                    <span className="font-mono text-[10px] text-[var(--ink-mute)]">
                      {fmtTime(e.created_at)}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-xs font-medium text-[var(--ink)]">
                    {e.title || (e.item_id ? `Item #${e.item_id}` : e.actor)}
                  </div>
                  {e.detail && (
                    <div className="mt-0.5 line-clamp-2 text-[11px] text-[var(--ink-mute)]">
                      {e.detail}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/audit"
            className="mt-3 inline-block text-xs font-semibold text-[var(--sky)] hover:underline"
          >
            Open full audit →
          </Link>
        </Card>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionTitle eyebrow="Action">Items that need you</SectionTitle>
            <Link
              href="/review"
              className="text-xs font-semibold text-[var(--sky)] hover:underline"
            >
              Open queue →
            </Link>
          </div>
          {!stats ? (
            <p className="text-sm text-[var(--ink-mute)]">Loading…</p>
          ) : stats.needsYou.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--paper-2)] px-4 py-8 text-center">
              <div className="font-display text-lg font-semibold text-[var(--ink)]">
                Queue clear
              </div>
              <p className="mt-1 text-sm text-[var(--ink-mute)]">
                No pending reviews. Run an intake or wait for the next gate hold.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] text-[10px] uppercase tracking-[0.12em] text-[var(--ink-mute)]">
                    <th className="py-2 pr-3 font-semibold">Matter</th>
                    <th className="py-2 pr-3 font-semibold">Urgency</th>
                    <th className="py-2 pr-3 font-semibold">Conf.</th>
                    <th className="py-2 pr-3 font-semibold">Obligations</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.needsYou.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--line)]/70 last:border-0"
                    >
                      <td className="max-w-[240px] py-3 pr-3">
                        <Link
                          href="/review"
                          className="font-semibold text-[var(--ink)] hover:underline"
                        >
                          {r.title}
                        </Link>
                        <div className="text-[11px] text-[var(--ink-mute)]">
                          {r.category || "Unclassified"} · #{r.id}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <UrgencyBadge urgency={r.urgency || "low"} />
                      </td>
                      <td className="py-3 pr-3">
                        <ConfidenceBadge score={r.confidence} />
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs">
                        {r.obligation_count}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5">
          <SectionTitle eyebrow="Recent">Pipeline feed</SectionTitle>
          {!stats ? (
            <p className="text-sm text-[var(--ink-mute)]">Loading…</p>
          ) : stats.recent.length === 0 ? (
            <p className="text-sm text-[var(--ink-mute)]">
              Nothing yet.{" "}
              <Link href="/intake" className="text-[var(--sky)] underline">
                Run your first intake
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {stats.recent.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{r.title}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1.5">
                      <Badge color="slate">{r.category || "—"}</Badge>
                      <Badge color={r.fast_path ? "green" : "blue"}>
                        {r.fast_path ? "fast" : "full"}
                      </Badge>
                      <UrgencyBadge urgency={r.urgency || "low"} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={r.status} />
                    <div className="mt-1 font-mono text-[10px] text-[var(--ink-mute)]">
                      {fmtTime(r.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
