"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, SectionTitle, Stat, StatusBadge, ConfidenceBadge, UrgencyBadge, Badge } from "@/components/ui";

type JevMeta = {
  version: string;
  trained_at: string;
  total_size_mb: number;
  tasks: Record<
    string,
    { accuracy: number; n_train: number; n_holdout: number; classes: string[] }
  >;
};

type Stats = {
  total: number;
  fastPathPct: number;
  avgConfidence: number | null;
  pendingCount: number;
  byCategory: { category: string; n: string }[];
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
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [jevMeta, setJevMeta] = useState<JevMeta | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setStats(d)))
      .catch(() => setError("Could not load dashboard."));
    fetch("/api/jevmeta")
      .then((r) => r.json())
      .then((d) => (d.unavailable ? null : setJevMeta(d)))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline dashboard</h1>
          <p className="text-sm text-stone-500">
            Small-model triage → routed drafting → confidence gate → human review.
          </p>
        </div>
        <Link
          href="/intake"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          New intake
        </Link>
      </div>

      {error && <Card className="mb-4 border-red-200 text-sm text-red-700">{error}</Card>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Items triaged" value={stats ? stats.total : "—"} sub="all time" />
        <Stat label="Fast path" value={stats ? `${stats.fastPathPct}%` : "—"} sub="handled by the small model" />
        <Stat
          label="Avg confidence"
          value={stats && stats.avgConfidence != null ? stats.avgConfidence.toFixed(2) : "—"}
          sub="Jev quality gate"
        />
        <Stat label="Pending review" value={stats ? stats.pendingCount : "—"} sub="needs a human" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle>Recent items</SectionTitle>
          {!stats ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : stats.recent.length === 0 ? (
            <p className="text-sm text-stone-500">
              Nothing yet. <Link href="/intake" className="text-blue-600 underline">Run your first intake</Link> or load a fictional sample.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Urgency</th>
                    <th className="py-2 pr-3">Conf.</th>
                    <th className="py-2 pr-3">Path</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((r) => (
                    <tr key={r.id} className="border-b border-stone-100 last:border-0">
                      <td className="max-w-[220px] truncate py-2 pr-3 font-medium">{r.title}</td>
                      <td className="py-2 pr-3 text-stone-600">{r.category || "—"}</td>
                      <td className="py-2 pr-3"><UrgencyBadge urgency={r.urgency || "low"} /></td>
                      <td className="py-2 pr-3"><ConfidenceBadge score={r.confidence} /></td>
                      <td className="py-2 pr-3">
                        <Badge color={r.fast_path ? "purple" : "blue"}>{r.fast_path ? "fast" : "full"}</Badge>
                      </td>
                      <td className="py-2"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card>
          <SectionTitle>By category</SectionTitle>
          {!stats ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : stats.byCategory.length === 0 ? (
            <p className="text-sm text-stone-500">No data yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {stats.byCategory.map((c) => (
                <li key={c.category} className="flex items-center justify-between">
                  <span className="text-stone-700">{c.category}</span>
                  <Badge color="slate">{c.n}</Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">
            Every triage, route, guardrail, confidence score and human decision is
            written to the <Link href="/audit" className="text-blue-600 underline">audit log</Link>.
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SectionTitle>How Jev works</SectionTitle>
          {jevMeta && <Badge color="green">{jevMeta.version} · local, no API calls</Badge>}
        </div>
        {!jevMeta ? (
          <p className="text-sm text-stone-500">Loading model info…</p>
        ) : (
          <div>
            <p className="text-sm text-stone-600">
              A trained small model (TF-IDF + logistic regression, probability-calibrated)
              runs inside this app and handles triage, injection screening and the
              confidence gate — the large Azure model only drafts memos.{" "}
              {jevMeta.total_size_mb} MB on disk, trained{" "}
              {new Date(jevMeta.trained_at).toLocaleDateString()}.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Object.entries(jevMeta.tasks).map(([task, t]) => (
                <div key={task} className="rounded-lg bg-stone-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {task}
                  </div>
                  <div className="mt-1 text-lg font-bold">
                    {(t.accuracy * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-stone-500">
                    holdout accuracy · {t.n_train + t.n_holdout} examples
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-stone-500">
              Trained on synthetic fictional regulatory text (see jev/README.md). The audit
              log records whether each step used jev-local-v1 or the Azure fallback.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
