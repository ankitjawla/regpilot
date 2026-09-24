"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Card, SectionTitle, Badge, StatusBadge, ConfidenceBadge, UrgencyBadge } from "@/components/ui";

type Sample = { id: string; title: string; label: string; preview: string; text: string };

type TriageResult = {
  blocked: boolean;
  itemId: number;
  guardrail: { piiFound: boolean; redactions: string[]; injectionSuspected: boolean; reason: string };
  triage?: {
    category: string;
    urgency: string;
    jurisdiction: string;
    confidence: number;
    rationale: string;
  };
  route?: { fastPath: boolean; model: string; reason: string };
};

type AnalyzeResult = {
  obligations: { owner: string; action: string; due_date: string; source_quote: string }[];
  memo: string;
  modelUsed: string;
  confidence: { score: number; reasons: string[] };
  gate: { status: string; label: string };
  status: string;
};

export default function Intake() {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [busy, setBusy] = useState<"triage" | "analyze" | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/samples")
      .then((r) => r.json())
      .then((d) => setSamples(d.samples || []))
      .catch(() => {});
  }, []);

  function reset() {
    setTriage(null);
    setAnalysis(null);
    setError("");
  }

  async function runTriage() {
    reset();
    setBusy("triage");
    try {
      const r = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, title }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Triage failed");
      setTriage(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runAnalyze() {
    if (!triage) return;
    setBusy("analyze");
    setError("");
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: triage.itemId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Analysis failed");
      setAnalysis(d);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result || ""));
      setTitle(f.name.replace(/\.(txt|md)$/i, ""));
      reset();
    };
    reader.readAsText(f);
  }

  function loadSample(s: Sample) {
    setText(s.text);
    setTitle(s.title);
    reset();
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold tracking-tight">New intake</h1>
      <p className="mb-6 text-sm text-stone-500">
        Paste a regulatory document or load a fictional sample. Jev redacts PII and
        screens for injection <em>before</em> anything reaches a model.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Source document</SectionTitle>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="mb-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); reset(); }}
            rows={12}
            placeholder="Paste the examination finding, rule update, SAR narrative…"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={runTriage}
              disabled={busy !== null || text.trim().length < 20}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy === "triage" ? "Triaging…" : "Run triage"}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Upload .txt / .md
            </button>
            <input ref={fileRef} type="file" accept=".txt,.md" className="hidden" onChange={onFile} />
          </div>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        </Card>

        <Card>
          <SectionTitle>Fictional samples — one click to load</SectionTitle>
          <div className="space-y-2">
            {samples.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSample(s)}
                className="w-full rounded-lg border border-stone-200 p-3 text-left hover:border-blue-400 hover:bg-blue-50/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{s.title}</span>
                  <Badge color="slate">{s.label}</Badge>
                </div>
                <p className="mt-1 text-xs text-stone-500">{s.preview}</p>
              </button>
            ))}
            {samples.length === 0 && <p className="text-sm text-stone-500">Loading samples…</p>}
          </div>
        </Card>
      </div>

      {triage && (
        <div className="mt-6 space-y-4">
          <Card className={triage.blocked ? "border-red-300" : ""}>
            <SectionTitle>1 · Guardrail (Jev small model + regex)</SectionTitle>
            {triage.blocked ? (
              <div>
                <Badge color="red">Blocked</Badge>
                <p className="mt-2 text-sm text-stone-700">{triage.guardrail.reason}</p>
                <p className="mt-1 text-xs text-stone-500">
                  Blocked inputs never reach the large model. The attempt was logged to the audit trail.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge color="green">Passed</Badge>
                {triage.guardrail.piiFound ? (
                  <Badge color="amber">PII redacted: {triage.guardrail.redactions.join(", ")}</Badge>
                ) : (
                  <Badge color="slate">No PII found</Badge>
                )}
                <span className="w-full text-xs text-stone-500">{triage.guardrail.reason}</span>
              </div>
            )}
          </Card>

          {!triage.blocked && triage.triage && triage.route && (
            <>
              <Card>
                <SectionTitle>2 · Triage (Jev small model)</SectionTitle>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge color="blue">{triage.triage.category}</Badge>
                  <UrgencyBadge urgency={triage.triage.urgency} />
                  <Badge color="slate">{triage.triage.jurisdiction}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                    confidence <ConfidenceBadge score={triage.triage.confidence} />
                  </span>
                </div>
                <p className="mt-2 text-sm text-stone-600">{triage.triage.rationale}</p>
                <div className="mt-3 rounded-lg bg-stone-50 p-3 text-sm">
                  <span className="font-semibold">Route: </span>
                  <Badge color={triage.route.fastPath ? "purple" : "blue"}>
                    {triage.route.fastPath ? "Fast path (small model)" : "Full analysis (large model)"}
                  </Badge>
                  <p className="mt-1 text-xs text-stone-500">{triage.route.reason}</p>
                  <p className="mt-1 font-mono text-[11px] text-stone-400">model: {triage.route.model}</p>
                </div>
              </Card>

              {!analysis && (
                <button
                  onClick={runAnalyze}
                  disabled={busy !== null}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  {busy === "analyze" ? "Analyzing… (obligations → memo → confidence gate)" : "Generate analysis"}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {analysis && (
        <div className="mt-6 space-y-4">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle>3 · Extracted obligations (large model)</SectionTitle>
              <span className="font-mono text-[11px] text-stone-400">extracted by large model</span>
            </div>
            {analysis.obligations.length === 0 ? (
              <p className="text-sm text-stone-500">No concrete obligations found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                      <th className="py-2 pr-3">Owner</th>
                      <th className="py-2 pr-3">Action</th>
                      <th className="py-2 pr-3">Due</th>
                      <th className="py-2">Source quote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.obligations.map((o, i) => (
                      <tr key={i} className="border-b border-stone-100 align-top last:border-0">
                        <td className="py-2 pr-3 font-medium">{o.owner}</td>
                        <td className="py-2 pr-3">{o.action}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{o.due_date}</td>
                        <td className="py-2 text-xs italic text-stone-500">“{o.source_quote}”</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle>4 · Draft memo</SectionTitle>
              <span className="font-mono text-[11px] text-stone-400">drafted by {analysis.modelUsed}</span>
            </div>
            <div className="memo rounded-lg bg-stone-50 p-4">
              <ReactMarkdown>{analysis.memo}</ReactMarkdown>
            </div>
          </Card>

          <Card>
            <SectionTitle>5 · Confidence gate (Jev small model)</SectionTitle>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-stone-600">Score</span>
              <ConfidenceBadge score={analysis.confidence.score} />
              <StatusBadge status={analysis.status} />
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-600">
              {analysis.confidence.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-stone-500">{analysis.gate.label}</p>
            {(analysis.status === "pending_review" || analysis.status === "needs_work") && (
              <Link
                href="/review"
                className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Go to review queue
              </Link>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
