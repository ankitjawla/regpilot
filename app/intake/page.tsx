"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Card, SectionTitle, Badge, StatusBadge, ConfidenceBadge, UrgencyBadge, PageHeader } from "@/components/ui";
import { usePipelineRun } from "@/components/pipeline-run";
import type { PipelineResultPayload } from "@/lib/pipeline-events";
import Link from "next/link";

type Sample = {
  id: string;
  title: string;
  label: string;
  framework?: string;
  preview: string;
  text: string;
  source?: "builtin" | "custom";
  dbId?: number;
};

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

function viewFromRun(payload: PipelineResultPayload | null | undefined): {
  triage: TriageResult | null;
  analysis: AnalyzeResult | null;
} {
  if (!payload?.guardrail || payload.itemId == null) {
    return { triage: null, analysis: null };
  }
  const triage: TriageResult = {
    blocked: Boolean(payload.blocked),
    itemId: payload.itemId,
    guardrail: payload.guardrail,
    triage: payload.triage,
    decisions: null,
    jev: payload.jev,
    route: payload.route,
  };
  if (payload.blocked || (!payload.memo && !payload.obligations)) {
    return { triage, analysis: null };
  }
  return {
    triage,
    analysis: {
      obligations: payload.obligations || [],
      memo: payload.memo || "",
      modelUsed: payload.modelUsed || "",
      confidence: payload.confidence || { score: 0, reasons: [] },
      gate: payload.gate || { status: payload.status || "", label: "" },
      status: payload.status || payload.gate?.status || "",
      grounding: payload.grounding,
    },
  };
}

export default function Intake() {
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [frameworks, setFrameworks] = useState<string[]>(["All"]);
  const [framework, setFramework] = useState("All");
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [busy, setBusy] = useState<"triage" | "analyze" | "pipeline" | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const restoredRun = useRef<string | null>(null);
  const { run, hydrated, startPipeline, clearRun } = usePipelineRun();
  const pipelineBusy = run?.status === "running";
  const sessionView = viewFromRun(run?.result);
  const panelTriage = sessionView.triage ?? triage;
  const panelAnalysis = sessionView.analysis ?? analysis;

  useEffect(() => {
    if (!hydrated || !run) return;
    if (restoredRun.current === run.id) return;
    restoredRun.current = run.id;
    setText(run.sourceText);
    setTitle(run.title);
  }, [hydrated, run]);

  useEffect(() => {
    fetch("/api/samples")
      .then((r) => r.json())
      .then((d) => {
        setSamples(d.samples || []);
        if (Array.isArray(d.frameworks) && d.frameworks.length) {
          setFrameworks(d.frameworks);
        }
      })
      .catch(() => {});
  }, []);

  const visibleSamples =
    framework === "All"
      ? samples
      : samples.filter((s) => s.framework === framework);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (busy || pipelineBusy) return;
        if (text.trim().length >= 20) runPipeline();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, title, busy, pipelineBusy]);

  function reset() {
    setTriage(null);
    setAnalysis(null);
    setError("");
  }

  async function runTriage() {
    clearRun();
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
    if (!panelTriage) return;
    setBusy("analyze");
    setError("");
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: panelTriage.itemId }),
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

  function runPipeline() {
    reset();
    startPipeline({ text, title });
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

  async function saveAsSample() {
    if (text.trim().length < 40) {
      setError("Need at least 40 characters to save a custom sample.");
      return;
    }
    setBusy("triage");
    setError("");
    try {
      const r = await fetch("/api/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Custom sample",
          framework: "Custom",
          text,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      const refreshed = await fetch("/api/samples").then((x) => x.json());
      setSamples(refreshed.samples || []);
      if (Array.isArray(refreshed.frameworks)) setFrameworks(refreshed.frameworks);
      setFramework("Custom");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deleteCustomSample(dbId: number) {
    setError("");
    try {
      const r = await fetch(`/api/samples?id=${dbId}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Delete failed");
      setSamples((prev) => prev.filter((s) => s.dbId !== dbId));
    } catch (e) {
      setError((e as Error).message);
    }
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

      {run && (
        <Card className="mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionTitle eyebrow="This session">
                {run.status === "running"
                  ? "Pipeline running"
                  : run.status === "error"
                    ? "Pipeline stopped"
                    : run.blocked
                      ? "Pipeline blocked"
                      : "Pipeline finished"}
              </SectionTitle>
              <p className="mt-1 text-sm text-[var(--ink-2)]">
                {run.title}
                {run.itemId != null ? ` · item ${run.itemId}` : ""}
                {run.error ? ` · ${run.error}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/workflow"
                className="rounded-lg bg-[var(--ink)] px-3 py-2 text-xs font-semibold text-white"
              >
                Watch on workflow
              </Link>
              {run.itemId != null && run.status === "done" && (
                <Link
                  href={`/items/${run.itemId}`}
                  className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
                >
                  Open package
                </Link>
              )}
              <button
                type="button"
                onClick={clearRun}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
              >
                Clear run
              </button>
            </div>
          </div>
          <ol className="mt-3 flex flex-wrap gap-1.5">
            {run.stages.map((s) => (
              <li
                key={s.id}
                className={`rounded-md px-2 py-1 font-mono text-[10px] font-semibold ${
                  s.state === "running"
                    ? "bg-[var(--sage)] text-white"
                    : s.state === "done"
                      ? "bg-[var(--sage-soft)] text-[var(--sage)]"
                      : s.state === "blocked"
                        ? "bg-[var(--coral)]/15 text-[var(--coral)]"
                        : s.state === "skipped"
                          ? "bg-[var(--paper-2)] text-[var(--ink-mute)] line-through"
                          : "bg-[var(--paper-2)] text-[var(--ink-mute)]"
                }`}
                title={s.detail || s.state}
              >
                {s.id}
              </li>
            ))}
          </ol>
        </Card>
      )}

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
              disabled={busy !== null || pipelineBusy || text.trim().length < 20}
              className="rounded-xl bg-[var(--sage)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d655e] disabled:opacity-50"
            >
              {pipelineBusy ? "Running full pipeline…" : "Run full pipeline ⌘↵"}
            </button>
            <button
              onClick={runTriage}
              disabled={busy !== null || pipelineBusy || text.trim().length < 20}
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
            <button
              onClick={saveAsSample}
              disabled={busy !== null || text.trim().length < 40}
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper-2)] disabled:opacity-50"
            >
              Save as sample
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
          <div className="mb-3 flex flex-wrap gap-1.5">
            {frameworks.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFramework(f)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                  framework === f
                    ? "bg-[var(--ink)] text-white"
                    : "bg-[var(--paper-2)] text-[var(--ink-mute)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {visibleSamples.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--paper-2)] p-3 transition hover:border-[var(--sage)] hover:bg-white"
              >
                <button
                  type="button"
                  onClick={() => loadSample(s)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{s.title}</span>
                    <Badge color={s.source === "custom" ? "green" : "slate"}>
                      {s.framework || s.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--ink-mute)]">{s.preview}</p>
                </button>
                {s.source === "custom" && s.dbId != null && (
                  <button
                    type="button"
                    onClick={() => deleteCustomSample(s.dbId!)}
                    className="mt-2 text-[11px] font-semibold text-[var(--coral)] hover:underline"
                  >
                    Delete custom sample
                  </button>
                )}
              </div>
            ))}
            {samples.length === 0 && (
              <p className="text-sm text-[var(--ink-mute)]">Loading samples…</p>
            )}
            {samples.length > 0 && visibleSamples.length === 0 && (
              <p className="text-sm text-[var(--ink-mute)]">
                No samples in this framework.
              </p>
            )}
          </div>
          <p className="mt-3 text-[11px] text-[var(--ink-mute)]">
            Includes CCAR, Dodd-Frank §165(d), COREP, FINREP, and Call Report
            (FFIEC 031) demos — all fictional.
          </p>
        </Card>
      </div>

      {panelTriage && (
        <div className="mt-6 space-y-4">
          <Card className={panelTriage.blocked ? "border-[var(--coral)]/40" : ""}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle eyebrow="Guardrail">PII + injection screen</SectionTitle>
              {modelBadge(panelTriage.jev?.model, panelTriage.jev?.latencyMs)}
            </div>
            {panelTriage.blocked ? (
              <div>
                <Badge color="red">Blocked</Badge>
                <p className="mt-2 text-sm text-[var(--ink)]">{panelTriage.guardrail.reason}</p>
                <p className="mt-1 text-xs text-[var(--ink-mute)]">
                  Blocked inputs never reach the large model. The attempt was logged to the audit trail.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge color="green">Passed</Badge>
                {panelTriage.guardrail.piiFound ? (
                  <Badge color="amber">PII redacted: {panelTriage.guardrail.redactions.join(", ")}</Badge>
                ) : (
                  <Badge color="slate">No PII found</Badge>
                )}
                <span className="w-full text-xs text-[var(--ink-mute)]">{panelTriage.guardrail.reason}</span>
              </div>
            )}
          </Card>

          {!panelTriage.blocked && panelTriage.triage && panelTriage.route && (
            <>
              <Card>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <SectionTitle eyebrow="Triage">System One judgments</SectionTitle>
                  {modelBadge(panelTriage.jev?.model, panelTriage.jev?.latencyMs)}
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge color="blue">{panelTriage.triage.category}</Badge>
                  <UrgencyBadge urgency={panelTriage.triage.urgency} />
                  <Badge color="slate">{panelTriage.triage.jurisdiction}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--ink-mute)]">
                    confidence <ConfidenceBadge score={panelTriage.triage.confidence} />
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--ink-2)]">{panelTriage.triage.rationale}</p>
                {panelTriage.decisions && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      {
                        label: "Injection",
                        value: panelTriage.decisions.injectionNoul,
                        hint: "noul · block ≥ 0.55",
                      },
                      {
                        label: "Escalate",
                        value: panelTriage.decisions.escalateNoul,
                        hint: "noul · full path ≥ 0.75 if non-routine",
                      },
                      {
                        label: "Category conf",
                        value: panelTriage.decisions.category.confidence,
                        hint: panelTriage.decisions.category.choice,
                      },
                      {
                        label: "Urgency conf",
                        value: panelTriage.decisions.urgency.confidence,
                        hint: panelTriage.decisions.urgency.choice,
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
                  <Badge color={panelTriage.route.fastPath ? "green" : "blue"}>
                    {panelTriage.route.fastPath ? "Fast path (draft model)" : "Full analysis (large model)"}
                  </Badge>
                  <p className="mt-1 text-xs text-[var(--ink-mute)]">{panelTriage.route.reason}</p>
                  <p className="mt-1 font-mono text-[11px] text-[var(--ink-mute)]">model: {panelTriage.route.model}</p>
                </div>
              </Card>

              {!panelAnalysis && (
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

      {panelAnalysis && (
        <div className="mt-6 space-y-4">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle eyebrow="Obligations">Extracted by Azure</SectionTitle>
              <span className="font-mono text-[11px] text-[var(--ink-mute)]">extracted by large model</span>
            </div>
            {panelAnalysis.obligations.length === 0 ? (
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
                    {panelAnalysis.obligations.map((o, i) => (
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
              <span className="font-mono text-[11px] text-[var(--ink-mute)]">drafted by {panelAnalysis.modelUsed}</span>
            </div>
            <div className="memo rounded-lg bg-[var(--paper-2)] p-4">
              <ReactMarkdown>{panelAnalysis.memo}</ReactMarkdown>
            </div>
          </Card>

          {panelAnalysis.grounding && (
            <Card>
              <SectionTitle eyebrow="TypeSafe">Grounding check</SectionTitle>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge color="green">
                  supported{" "}
                  {panelAnalysis.grounding.overallSupported != null
                    ? panelAnalysis.grounding.overallSupported.toFixed(2)
                    : "—"}
                </Badge>
                <Badge
                  color={
                    (panelAnalysis.grounding.unsupportedCount || 0) > 0 ? "amber" : "slate"
                  }
                >
                  unsupported {panelAnalysis.grounding.unsupportedCount ?? 0}
                </Badge>
                {panelAnalysis.grounding.inventedClaims != null && (
                  <Badge
                    color={
                      panelAnalysis.grounding.inventedClaims > 0.55 ? "red" : "slate"
                    }
                  >
                    invented {panelAnalysis.grounding.inventedClaims.toFixed(2)}
                  </Badge>
                )}
              </div>
            </Card>
          )}

          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle eyebrow="Gate">Confidence</SectionTitle>
              {modelBadge(panelAnalysis.confidence.model)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-[var(--ink-2)]">Score</span>
              <ConfidenceBadge score={panelAnalysis.confidence.score} />
              <StatusBadge status={panelAnalysis.status} />
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--ink-2)]">
              {panelAnalysis.confidence.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[var(--ink-mute)]">{panelAnalysis.gate.label}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {panelTriage && (
                <Link
                  href={`/items/${panelTriage.itemId}`}
                  className="inline-block rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--ink-2)]"
                >
                  Open examiner package
                </Link>
              )}
              {(panelAnalysis.status === "pending_review" ||
                panelAnalysis.status === "needs_work") && (
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
