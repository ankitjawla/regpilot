"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Badge, PageHeader } from "@/components/ui";

type Entry = {
  id: number;
  item_id: number | null;
  title: string | null;
  actor: string;
  action: string;
  detail: string | null;
  created_at: string;
};

const ACTORS = ["", "human", "router", "gate", "jev-small"];

export default function AuditLog() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [actor, setActor] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (actor) params.set("actor", actor);
    if (q) params.set("q", q);
    const r = await fetch(`/api/audit?${params.toString()}`);
    const d = await r.json();
    if (d.error) setError(d.error);
    else setEntries(d.entries || []);
  }

  useEffect(() => {
    load().catch(() => setError("Could not load audit log."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor]);

  const actorColor = (a: string) =>
    a === "human"
      ? "green"
      : a === "gate"
        ? "amber"
        : a === "router"
          ? "blue"
          : a.includes("jev") || a.startsWith("jev")
            ? "slate"
            : "slate";

  return (
    <div>
      <PageHeader
        title="Audit"
        subtitle="Every model and human decision, in order. Filter by actor or search actions, details and titles."
      />

      <Card className="mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap gap-1">
            {ACTORS.map((a) => (
              <button
                key={a || "all"}
                onClick={() => setActor(a)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  actor === a
                    ? "bg-[var(--ink)] text-white"
                    : "bg-[var(--paper-2)] text-[var(--ink-mute)] hover:bg-white"
                }`}
              >
                {a === "" ? "All" : a}
              </button>
            ))}
          </div>
          <form
            className="flex min-w-[16rem] flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search actions, details, titles…"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2 text-sm outline-none ring-[var(--sage)] focus:ring-2"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white"
            >
              Search
            </button>
          </form>
        </div>
      </Card>

      {error && (
        <Card className="mb-4 border-[var(--coral)]/30 text-sm text-[var(--coral)]">
          {error}
        </Card>
      )}

      <Card>
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--ink-mute)]">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-[10px] uppercase tracking-[0.12em] text-[var(--ink-mute)]">
                  <th className="py-2 pr-3 font-semibold">Time</th>
                  <th className="py-2 pr-3 font-semibold">Item</th>
                  <th className="py-2 pr-3 font-semibold">Actor</th>
                  <th className="py-2 pr-3 font-semibold">Action</th>
                  <th className="py-2 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-[var(--line)]/70 align-top last:border-0"
                  >
                    <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-[11px] text-[var(--ink-mute)]">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="max-w-[180px] truncate py-2.5 pr-3 text-xs">
                      {e.item_id ? (
                        <Link
                          href={`/items/${e.item_id}`}
                          className="font-medium text-[var(--ink)] hover:underline"
                        >
                          #{e.item_id} {e.title || ""}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge color={actorColor(e.actor) as "green" | "slate" | "amber" | "blue"}>
                        {e.actor}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-xs">
                      {e.action}
                    </td>
                    <td
                      className="max-w-[360px] truncate py-2.5 text-xs text-[var(--ink-2)]"
                      title={e.detail || ""}
                    >
                      {e.detail || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
