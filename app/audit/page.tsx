"use client";

import { useEffect, useState } from "react";
import { Card, SectionTitle, Badge } from "@/components/ui";

type Entry = {
  id: number;
  item_id: number | null;
  title: string | null;
  actor: string;
  action: string;
  detail: string | null;
  created_at: string;
};

const ACTORS = ["", "jev-small", "router", "gate", "human"];

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
    a === "human" ? "green" : a === "jev-small" ? "purple" : a === "gate" ? "amber" : a === "router" ? "blue" : "slate";

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Audit log</h1>
      <p className="mb-6 text-sm text-stone-500">
        Every model and human decision, in order. Filter by actor or search actions, details and titles.
      </p>

      <Card className="mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">
            {ACTORS.map((a) => (
              <button
                key={a}
                onClick={() => setActor(a)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  actor === a ? "bg-slate-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {a === "" ? "All" : a}
              </button>
            ))}
          </div>
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => { e.preventDefault(); load(); }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search actions, details, titles…"
              className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white">
              Search
            </button>
          </form>
        </div>
      </Card>

      {error && <Card className="mb-4 border-red-200 text-sm text-red-700">{error}</Card>}

      <Card>
        {entries.length === 0 ? (
          <p className="text-sm text-stone-500">No entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2">Detail</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-stone-100 align-top last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3 text-xs text-stone-500">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="max-w-[180px] truncate py-2 pr-3 text-xs">
                      {e.item_id ? `#${e.item_id} ${e.title || ""}` : "—"}
                    </td>
                    <td className="py-2 pr-3"><Badge color={actorColor(e.actor) as "green"}>{e.actor}</Badge></td>
                    <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs">{e.action}</td>
                    <td className="max-w-[320px] truncate py-2 text-xs text-stone-600" title={e.detail || ""}>
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
