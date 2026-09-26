"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Card, SectionTitle, Badge, StatusBadge, ConfidenceBadge, UrgencyBadge, PageHeader } from "@/components/ui";

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
  decisions?: {
    injectionNoul: number;
    escalateNoul: number;
    category: { choice: string; confidence: number; probabilities: Record<string, number> };
    urgency: { choice: string; confidence: number; probabilities: Record<string, number> };
    jurisdiction: { choice: string; confidence: number; probabilities: Record<string, number> };
  } | null;
  jev?: { model: string; latencyMs: number | null };
  route?: { fastPath: boolean; model: string; reason: string };
};

type AnalyzeResult = {
  obligations: { owner: string; action: string; due_date: string; source_quote: string }[];
  memo: string;
  modelUsed: string;
  confidence: { score: number; reasons: string[]; model?: string };
  gate: { status: string; label: string };
  status: string;
  grounding?: {
    model?: string;
    overallSupported?: number;
    inventedClaims?: number;
    unsupportedCount?: number;
  } | null;
};

export default function Intake() {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [busy, setBusy] = useState<"triage" | "analyze" | "pipeline" | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/samples")
      .then((r) => r.json())
      .then((d) => setSamples(d.samples || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (busy) return;
        if (text.trim().length >= 20) runPipeline();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, title, busy]);

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

  async function runPipeline() {
    reset();
    setBusy("pipeline");
    try {
      const r = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, title }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Pipeline failed");
      setTriage({
        blocked: d.blocked,
        itemId: d.itemId,
        guardrail: d.guardrail,
        triage: d.triage,
        decisions: d.decisions ?? null,
        jev: d.jev,
        route: d.route,
      });
      if (!d.blocked) {
        setAnalysis({
          obligations: d.obligations || [],
          memo: d.memo || "",
          modelUsed: d.modelUsed || "",
          confidence: d.confidence || { score: 0, reasons: [] },
          gate: d.gate || { status: d.status, label: "" },
          status: d.status,
          grounding: d.grounding,
        });
      }
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

  function modelBadge(model?: string | null, latencyMs?: number | null) {
    if (!model) return null;
    const isTypesafe = model.startsWith("jev-") && model !== "jev-local-v1";
    const isLocal = model === "jev-local-v1";
    const label = isTypesafe
      ? `TypeSafe ${model}`
      : isLocal
        ? "Jev local model"
        : `Azure ${model}`;
    return (
      <Badge color={isTypesafe || isLocal ? "green" : "slate"}>
        {label}
        {latencyMs != null ? ` · ${latencyMs}ms` : ""}
      </Badge>
    );
  }

  return (
    <div>
      <PageHeader
        title="Intake"
        subtitle="Paste a regulatory document or load a fictional sample. TypeSafe System One redacts PII and screens for injection before Azure OpenAI drafts."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle eyebrow="Source">Document</SectionTitle>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="mb-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 text-sm outline-none ring-[var(--sage)] focus:ring-2"
          />
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); reset(); }}
            rows={12}
            placeholder="Paste the examination finding, rule update, SAR narrative…"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 text-sm outline-none ring-[var(--sage)] focus:ring-2"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={runPipeline}
              disabled={busy !== null || text.trim().length < 20}
              className="rounded-xl bg-[var(--sage)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d655e] disabled:opacity-50"
            >
              {busy === "pipeline"
                ? "Running full pipeline…"
                : "Run full pipeline ⌘↵"}
            </button>
            <button
              onClick={runTriage}
              disabled={busy !== null || text.trim().length < 20}
              className="rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ink-2)] disabled:opacity-50"
            >
              {busy === "triage" ? "Triaging…" : "Triage only"}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper-2)]"
            >
              Upload .txt / .md
            </button>
            <input ref={fileRef} type="file" accept=".txt,.md" className="hidden" onChange={onFile} />
          </div>
          <p className="mt-2 text-[11px] text-[var(--ink-mute)]">
            Full pipeline = guardrail → triage → draft → confidence → grounding → gate.
          </p>
          {error && <p className="mt-3 text-sm text-[var(--coral)]">{error}</p>}
        </Card>

        <Card>
          <SectionTitle eyebrow="Library">Fictional samples</SectionTitle>
          <div className="space-y-2">
            {samples.map((s) => (
              <button
                key={s.id}
                onClick={() => loadSample(s)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3 text-left transition hover:border-[var(--sage)] hover:bg-white"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{s.title}</span>
                  <Badge color="slate">{s.label}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-mute)]">{s.preview}</p>
              </button>
            ))}
            {samples.length === 0 && <p className="text-sm text-[var(--ink-mute)]">Loading samples…</p>}
          </div>
        </Card>
      </div>

      {triage && (
        <div className="mt-6 space-y-4">
          <Card className={triage.blocked ? "border-[var(--coral)]/40" : ""}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle eyebrow="Guardrail">PII + injection screen</SectionTitle>
              {modelBadge(triage.jev?.model, triage.jev?.latencyMs)}
            </div>
            {triage.blocked ? (
              <div>
                <Badge color="red">Blocked</Badge>
                <p className="mt-2 text-sm text-[var(--ink)]">{triage.guardrail.reason}</p>
                <p className="mt-1 text-xs text-[var(--ink-mute)]">
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
                <span className="w-full text-xs text-[var(--ink-mute)]">{triage.guardrail.reason}</span>
              </div>
            )}
          </Card>

          {!triage.blocked && triage.triage && triage.route && (
            <>
              <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <SectionTitle eyebrow="Triage">System One judgments</SectionTitle>
                  {modelBadge(triage.jev?.model, triage.jev?.latencyMs)}
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge color="blue">{triage.triage.category}</Badge>
                  <UrgencyBadge urgency={triage.triage.urgency} />
                  <Badge color="slate">{triage.triage.jurisdiction}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--ink-mute)]">
                    confidence <ConfidenceBadge score={triage.triage.confidence} />
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--ink-2)]">{triage.triage.rationale}</p>
                {triage.decisions && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        label: "Injection",
                        value: triage.decisions.injectionNoul,
                        hint: "noul · block ≥ 0.55",
                      },
                      {
                        label: "Escalate",
                        value: triage.decisions.escalateNoul,
                        hint: "noul · full path ≥ 0.75 if non-routine",
                      },
                      {
                        label: "Category conf",
                        value: triage.decisions.category.confidence,
                        hint: triage.decisions.category.choice,
                      },
                      {
                        label: "Urgency conf",
                        value: triage.decisions.urgency.confidence,
                        hint: triage.decisions.urgency.choice,
                      },
                    ].map((c) => (
                      <div key={c.label} className="rounded-lg bg-[var(--paper-2)] px-3 py-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-mute)]">
                          {c.label}
                        </div>
                        <div className="text-lg font-bold tabular-nums">
                          {c.value.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-[var(--ink-mute)]">{c.hint}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3 text-sm">
                  <span className="font-semibold">Route: </span>
                  <Badge color={triage.route.fastPath ? "green" : "blue"}>
                    {triage.route.fastPath ? "Fast path (draft model)" : "Full analysis (large model)"}
                  </Badge>
                  <p className="mt-1 text-xs text-[var(--ink-mute)]">{triage.route.reason}</p>
                  <p className="mt-1 font-mono text-[11px] text-[var(--ink-mute)]">model: {triage.route.model}</p>
                </div>
              </Card>

              {!analysis && (
                <button
                  onClick={runAnalyze}
                  disabled={busy !== null}
                  className="rounded-xl bg-[var(--sage)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d655e] disabled:opacity-50"
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
              <SectionTitle eyebrow="Obligations">Extracted by Azure</SectionTitle>
              <span className="font-mono text-[11px] text-[var(--ink-mute)]">extracted by large model</span>
            </div>
            {analysis.obligations.length === 0 ? (
              <p className="text-sm text-[var(--ink-mute)]">No concrete obligations found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--ink-mute)]">
                      <th className="py-2 pr-3">Owner</th>
                      <th className="py-2 pr-3">Action</th>
                      <th className="py-2 pr-3">Due</th>
                      <th className="py-2">Source quote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.obligations.map((o, i) => (
                      <tr key={i} className="border-b border-[var(--line)]/70 align-top last:border-0">
                        <td className="py-2 pr-3 font-medium">{o.owner}</td>
                        <td className="py-2 pr-3">{o.action}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{o.due_date}</td>
                        <td className="py-2 text-xs italic text-[var(--ink-mute)]">“{o.source_quote}”</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle eyebrow="Memo">Draft</SectionTitle>
              <span className="font-mono text-[11px] text-[var(--ink-mute)]">drafted by {analysis.modelUsed}</span>
            </div>
            <div className="memo rounded-lg bg-[var(--paper-2)] p-4">
              <ReactMarkdown>{analysis.memo}</ReactMarkdown>
            </div>
          </Card>

          {analysis.grounding && (
            <Card>
              <SectionTitle eyebrow="TypeSafe">Grounding check</SectionTitle>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge color="green">
                  supported{" "}
                  {analysis.grounding.overallSupported != null
                    ? analysis.grounding.overallSupported.toFixed(2)
                    : "—"}
                </Badge>
                <Badge
                  color={
                    (analysis.grounding.unsupportedCount || 0) > 0 ? "amber" : "slate"
                  }
                >
                  unsupported {analysis.grounding.unsupportedCount ?? 0}
                </Badge>
                {analysis.grounding.inventedClaims != null && (
                  <Badge
                    color={
                      analysis.grounding.inventedClaims > 0.55 ? "red" : "slate"
                    }
                  >
                    invented {analysis.grounding.inventedClaims.toFixed(2)}
                  </Badge>
                )}
              </div>
            </Card>
          )}

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle eyebrow="Gate">Confidence</SectionTitle>
              {modelBadge(analysis.confidence.model)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[var(--ink-2)]">Score</span>
              <ConfidenceBadge score={analysis.confidence.score} />
              <StatusBadge status={analysis.status} />
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--ink-2)]">
              {analysis.confidence.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[var(--ink-mute)]">{analysis.gate.label}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {triage && (
                <Link
                  href={`/items/${triage.itemId}`}
                  className="inline-block rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--ink-2)]"
                >
                  Open examiner package
                </Link>
              )}
              {(analysis.status === "pending_review" ||
                analysis.status === "needs_work") && (
                <Link
                  href="/review"
                  className="inline-block rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  Go to review queue
                </Link>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
