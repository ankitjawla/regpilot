"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  SectionTitle,
  Badge,
  PageHeader,
} from "@/components/ui";
import type { AgentConfig } from "@/lib/agents";

type AgentKey = Exclude<
  keyof AgentConfig,
  "version" | "updatedAt" | "preset" | "console"
>;

const AGENT_KEYS: AgentKey[] = [
  "guardrail",
  "triage",
  "router",
  "draft",
  "grounding",
  "confidence",
  "gate",
];

function Threshold({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--ink)]">{label}</span>
        <span className="font-mono text-xs text-[var(--ink-mute)]">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--sage)]"
      />
      {hint && (
        <p className="mt-0.5 text-[11px] text-[var(--ink-mute)]">{hint}</p>
      )}
    </label>
  );
}

export default function AgentsPage() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [selected, setSelected] = useState<AgentKey>("guardrail");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [dirty, setDirty] = useState(false);

  async function load() {
    const r = await fetch("/api/agents");
    const d = await r.json();
    setConfig(d.config);
    setDirty(false);
  }

  useEffect(() => {
    load().catch(() => setError("Could not load agent config."));
  }, []);

  function patchSelected(patch: Record<string, unknown>) {
    if (!config) return;
    setConfig({
      ...config,
      preset: "custom",
      [selected]: { ...config[selected], ...patch },
    });
    setDirty(true);
    setSaved("");
  }

  async function save() {
    if (!config) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/agents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      setConfig(d.config);
      setDirty(false);
      setSaved(`Saved · v${d.config.version}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resetDefaults() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Reset failed");
      setConfig(d.config);
      setDirty(false);
      setSaved("Reset to defaults");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const agent = config?.[selected];

  return (
    <div>
      <PageHeader
        title="Agents"
        subtitle="Edit System One / Azure / gate policies. Thresholds apply on the next triage, pipeline, or analyze call."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/settings"
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[var(--paper-2)]"
            >
              Settings & presets
            </Link>
            <Link
              href="/workflow"
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[var(--paper-2)]"
            >
              Open workflow
            </Link>
            <button
              type="button"
              onClick={resetDefaults}
              disabled={busy}
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              Reset defaults
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy || !dirty}
              className="rounded-xl bg-[var(--sage)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save policy"}
            </button>
          </div>
        }
      />

      {error && (
        <Card className="mb-4 border-[var(--coral)]/30 text-sm text-[var(--coral)]">
          {error}
        </Card>
      )}
      {saved && (
        <Card className="mb-4 border-[var(--sage)]/30 text-sm text-[var(--sage)]">
          {saved}
        </Card>
      )}

      {!config ? (
        <Card>
          <p className="text-sm text-[var(--ink-mute)]">Loading agents…</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-4">
            <SectionTitle eyebrow="Stack">Decision agents</SectionTitle>
            <p className="mb-3 text-xs text-[var(--ink-mute)]">
              Config v{config.version} · preset{" "}
              <Badge color="slate">{config.preset}</Badge>
              {config.updatedAt
                ? ` · ${new Date(config.updatedAt).toLocaleString()}`
                : " · defaults"}
              {dirty ? " · unsaved" : ""}
            </p>
            <ul className="space-y-1.5">
              {AGENT_KEYS.map((key) => {
                const a = config[key];
                const active = selected === key;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => setSelected(key)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-[var(--sage)] bg-[var(--sage-soft)]/40"
                          : "border-[var(--line)] bg-[var(--paper-2)] hover:bg-white"
                      }`}
                    >
                      <span>
                        <span className="block text-sm font-semibold">
                          {a.label}
                        </span>
                        <span className="block font-mono text-[10px] text-[var(--ink-mute)]">
                          {key}
                        </span>
                      </span>
                      <Badge color={a.enabled ? "green" : "amber"}>
                        {a.enabled ? "on" : "off"}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="space-y-4 lg:col-span-8">
            {agent && (
              <>
                <Card>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <SectionTitle eyebrow="Agent">{agent.label}</SectionTitle>
                    <label className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={agent.enabled}
                        onChange={(e) =>
                          patchSelected({ enabled: e.target.checked })
                        }
                      />
                      Enabled
                    </label>
                  </div>
                  <label className="mb-3 block">
                    <span className="mb-1 block text-xs font-semibold text-[var(--ink-mute)]">
                      Display label
                    </span>
                    <input
                      value={agent.label}
                      onChange={(e) => patchSelected({ label: e.target.value })}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 text-sm outline-none ring-[var(--sage)] focus:ring-2"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-[var(--ink-mute)]">
                      Role description
                    </span>
                    <textarea
                      value={agent.description}
                      onChange={(e) =>
                        patchSelected({ description: e.target.value })
                      }
                      rows={3}
                      className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 text-sm outline-none ring-[var(--sage)] focus:ring-2"
                    />
                  </label>
                </Card>

                <Card>
                  <SectionTitle eyebrow="Policy">Thresholds</SectionTitle>
                  <div className="mt-3 space-y-4">
                    {selected === "guardrail" && "injectionBlockThreshold" in agent && (
                      <Threshold
                        label="Injection block noul"
                        value={agent.injectionBlockThreshold}
                        onChange={(n) =>
                          patchSelected({ injectionBlockThreshold: n })
                        }
                        hint="TypeSafe injection noul at/above this blocks the input."
                      />
                    )}
                    {selected === "triage" &&
                      "escalateFullPathThreshold" in agent && (
                        <>
                          <Threshold
                            label="Escalate → full path"
                            value={agent.escalateFullPathThreshold}
                            onChange={(n) =>
                              patchSelected({ escalateFullPathThreshold: n })
                            }
                            hint="Escalate noul at/above this forces full Azure analysis (when non-routine or low conf)."
                          />
                          <Threshold
                            label="Fast-path min confidence"
                            value={agent.fastPathMinConfidence}
                            onChange={(n) =>
                              patchSelected({ fastPathMinConfidence: n })
                            }
                          />
                          <Threshold
                            label="Escalate confidence ceiling"
                            value={agent.escalateConfidenceCeiling}
                            onChange={(n) =>
                              patchSelected({ escalateConfidenceCeiling: n })
                            }
                            hint="Routine items only escalate when confidence is below this."
                          />
                        </>
                      )}
                    {selected === "router" && "routineCategories" in agent && (
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-[var(--ink-mute)]">
                          Routine categories (comma-separated)
                        </span>
                        <input
                          value={agent.routineCategories.join(", ")}
                          onChange={(e) =>
                            patchSelected({
                              routineCategories: e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 text-sm outline-none ring-[var(--sage)] focus:ring-2"
                        />
                      </label>
                    )}
                    {selected === "grounding" && "supportThreshold" in agent && (
                      <>
                        <Threshold
                          label="Overall support soft-fail below"
                          value={agent.supportThreshold}
                          onChange={(n) =>
                            patchSelected({ supportThreshold: n })
                          }
                        />
                        <Threshold
                          label="Invented-claims soft-fail above"
                          value={agent.inventedThreshold}
                          onChange={(n) =>
                            patchSelected({ inventedThreshold: n })
                          }
                        />
                      </>
                    )}
                    {selected === "gate" && "autoApproveAbove" in agent && (
                      <>
                        <Threshold
                          label="Auto-approve above"
                          value={agent.autoApproveAbove}
                          onChange={(n) =>
                            patchSelected({ autoApproveAbove: n })
                          }
                        />
                        <Threshold
                          label="Human confirm above"
                          value={agent.humanConfirmAbove}
                          onChange={(n) =>
                            patchSelected({ humanConfirmAbove: n })
                          }
                          hint="Below this → needs_work; between this and auto-approve → pending_review."
                        />
                      </>
                    )}
                    {selected === "draft" && "obligationSystemPrompt" in agent && (
                      <>
                        <p className="text-sm text-[var(--ink-mute)]">
                          Edit full Azure system prompts under Settings. Quick
                          toggle and labels live here.
                        </p>
                        <Link
                          href="/settings"
                          className="inline-block text-xs font-semibold text-[var(--sky)] hover:underline"
                        >
                          Open draft prompts →
                        </Link>
                      </>
                    )}
                    {selected === "confidence" && (
                      <p className="text-sm text-[var(--ink-mute)]">
                        Confidence uses TypeSafe nouls + score when configured.
                        Soft-caps come from the grounding agent thresholds.
                      </p>
                    )}
                  </div>
                </Card>

                <Card>
                  <SectionTitle eyebrow="Runtime">Where it runs</SectionTitle>
                  <ul className="mt-2 space-y-1.5 text-sm text-[var(--ink-2)]">
                    {selected === "guardrail" && (
                      <>
                        <li>
                          <code className="font-mono text-xs">lib/redact.ts</code>{" "}
                          — deterministic PII
                        </li>
                        <li>
                          <code className="font-mono text-xs">
                            lib/jev.ts#jevGuardrail
                          </code>
                        </li>
                        <li>
                          <code className="font-mono text-xs">
                            lib/typesafe.ts#typesafeTriage
                          </code>{" "}
                          — injection noul
                        </li>
                      </>
                    )}
                    {selected === "triage" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/typesafe.ts#typesafeTriage
                        </code>{" "}
                        · Choice + escalate Noul
                      </li>
                    )}
                    {selected === "router" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/jev.ts#routeDecision
                        </code>
                      </li>
                    )}
                    {selected === "draft" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/jev.ts#extractObligations / draftMemo
                        </code>{" "}
                        · Azure gpt-5.4
                      </li>
                    )}
                    {selected === "grounding" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/typesafe.ts#typesafeGroundObligations
                        </code>
                      </li>
                    )}
                    {selected === "confidence" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/typesafe.ts#typesafeConfidence
                        </code>
                      </li>
                    )}
                    {selected === "gate" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/jev.ts#gateDecision
                        </code>
                      </li>
                    )}
                  </ul>
                  <Link
                    href="/workflow"
                    className="mt-3 inline-block text-xs font-semibold text-[var(--sky)] hover:underline"
                  >
                    See this step on the workflow map →
                  </Link>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
