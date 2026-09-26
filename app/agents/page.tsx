"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  SectionTitle,
  Badge,
  PageHeader,
} from "@/components/ui";
import { AgentPlainEnglish, JevPrimerCard } from "@/components/jev-primer";
import type { AgentConfig } from "@/lib/agents";
import type { AgentKeyForPrimer } from "@/lib/jev-primer";

type AgentKey = Exclude<
  keyof AgentConfig,
  "version" | "updatedAt" | "preset" | "console"
>;

const AGENT_KEYS: AgentKey[] = [
  "guardrail",
  "triage",
  "router",
  "draft",
  "dedupe",
  "grounding",
  "playbook",
  "hazard",
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
        subtitle="Tune how Jev (System One) judges risk and quality, and how Azure drafts. Changes apply on the next triage, pipeline, or analyze run."
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
        <div className="space-y-4">
          <JevPrimerCard />
          <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-4">
            <SectionTitle eyebrow="Stack">Pipeline agents</SectionTitle>
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
                <AgentPlainEnglish agentKey={selected as AgentKeyForPrimer} />

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
                      Short role (shown on workflow)
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
                  <p className="mt-1 text-xs text-[var(--ink-mute)]">
                    Numbers are probabilities or scores from 0 to 1 unless noted.
                    Lower block/escalate cutoffs = stricter.
                  </p>
                  <div className="mt-3 space-y-4">
                    {selected === "guardrail" && "injectionBlockThreshold" in agent && (
                      <Threshold
                        label="Block when injection probability ≥"
                        value={agent.injectionBlockThreshold}
                        onChange={(n) =>
                          patchSelected({ injectionBlockThreshold: n })
                        }
                        hint="Jev noul for “is this prompt injection?” At or above this value, intake is blocked and Azure never runs. Example: 0.55 blocks likely attacks; 0.04 is very strict."
                      />
                    )}
                    {selected === "triage" &&
                      "escalateFullPathThreshold" in agent && (
                        <>
                          <Threshold
                            label="Escalate when urgency probability ≥"
                            value={agent.escalateFullPathThreshold}
                            onChange={(n) =>
                              patchSelected({ escalateFullPathThreshold: n })
                            }
                            hint="Jev escalate noul. At/above this, prefer full Azure analysis instead of the cheap path."
                          />
                          <Threshold
                            label="Fast path needs category confidence ≥"
                            value={agent.fastPathMinConfidence}
                            onChange={(n) =>
                              patchSelected({ fastPathMinConfidence: n })
                            }
                            hint="Only skip the large model when triage is at least this sure about the category."
                          />
                          <Threshold
                            label="Escalate routine items if confidence &lt;"
                            value={agent.escalateConfidenceCeiling}
                            onChange={(n) =>
                              patchSelected({ escalateConfidenceCeiling: n })
                            }
                            hint="Even “routine” categories take the full path when confidence is below this."
                          />
                          <Threshold
                            label="Uncertain band — low"
                            value={agent.noulUncertainLow}
                            onChange={(n) =>
                              patchSelected({ noulUncertainLow: n })
                            }
                            hint="Yes/no nouls between low and high are marked uncertain (needs human confirm), not a hard yes/no."
                          />
                          <Threshold
                            label="Uncertain band — high"
                            value={agent.noulUncertainHigh}
                            onChange={(n) =>
                              patchSelected({ noulUncertainHigh: n })
                            }
                            hint="Above this ≈ clear yes; below the low ≈ clear no."
                          />
                          <Threshold
                            label="Choice must be this confident"
                            value={agent.choiceMinConfidence}
                            onChange={(n) =>
                              patchSelected({ choiceMinConfidence: n })
                            }
                            hint="If category/urgency/jurisdiction confidence is below this, the choice is uncertain."
                          />
                          <Threshold
                            label="Use coarse label if fine confidence &lt;"
                            value={agent.coarseTaxonomyCutoff}
                            onChange={(n) =>
                              patchSelected({ coarseTaxonomyCutoff: n })
                            }
                            hint="Example: report “Financial Crime” instead of a shaky “AML-BSA” leaf."
                          />
                          <label className="flex items-center gap-2 text-sm font-semibold">
                            <input
                              type="checkbox"
                              checked={agent.beamClassifyEnabled}
                              onChange={(e) =>
                                patchSelected({
                                  beamClassifyEnabled: e.target.checked,
                                })
                              }
                            />
                            Also classify domain → framework → topic (beam)
                          </label>
                        </>
                      )}
                    {selected === "draft" && "sdeCascadeEnabled" in agent && (
                      <>
                        <label className="flex items-center gap-2 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={agent.sdeCascadeEnabled}
                            onChange={(e) =>
                              patchSelected({
                                sdeCascadeEnabled: e.target.checked,
                              })
                            }
                          />
                          SDE cascade (small → verify → big)
                        </label>
                        <Threshold
                          label="Re-run large model if field looks wrong ≥"
                          value={agent.sdeFireThreshold}
                          onChange={(n) =>
                            patchSelected({ sdeFireThreshold: n })
                          }
                          hint="Jev noul that an extracted field is wrong. At/above this, escalate from Azure small → big."
                        />
                        <label className="flex items-center gap-2 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={agent.dueDateExtractEnabled}
                            onChange={(e) =>
                              patchSelected({
                                dueDateExtractEnabled: e.target.checked,
                              })
                            }
                          />
                          Extract due dates with Jev (typed parts)
                        </label>
                        <Threshold
                          label="Flag due date for review if confidence &lt;"
                          value={agent.dueDateReviewBelow}
                          onChange={(n) =>
                            patchSelected({ dueDateReviewBelow: n })
                          }
                          hint="Assembled ISO dates below this confidence are marked needs_review."
                        />
                        <label className="flex items-center gap-2 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={agent.dueDateForceConfirm}
                            onChange={(e) =>
                              patchSelected({
                                dueDateForceConfirm: e.target.checked,
                              })
                            }
                          />
                          Force human confirm when any due date needs review
                        </label>
                        <Link
                          href="/settings"
                          className="inline-block text-xs font-semibold text-[var(--sky)] hover:underline"
                        >
                          Open draft prompts →
                        </Link>
                      </>
                    )}
                    {selected === "grounding" && "supportThreshold" in agent && (
                      <>
                        <Threshold
                          label="Soft-fail if overall support &lt;"
                          value={agent.supportThreshold}
                          onChange={(n) =>
                            patchSelected({ supportThreshold: n })
                          }
                          hint="Average “is this supported by the source?” noul below this caps confidence."
                        />
                        <Threshold
                          label="Soft-fail if invented-claims probability ≥"
                          value={agent.inventedThreshold}
                          onChange={(n) =>
                            patchSelected({ inventedThreshold: n })
                          }
                          hint="Jev noul that the memo invents claims not in the source."
                        />
                        <Threshold
                          label="Auto-accept citation if confidence ≥"
                          value={agent.citationAutoAccept}
                          onChange={(n) =>
                            patchSelected({ citationAutoAccept: n })
                          }
                          hint="Citation Choice (supports / contradicts / says nothing). Below this → human confirm."
                        />
                      </>
                    )}
                    {selected === "confidence" &&
                      "weightGrounded" in agent && (
                        <>
                          <Threshold
                            label="How much grounded matters"
                            value={agent.weightGrounded}
                            onChange={(n) =>
                              patchSelected({ weightGrounded: n })
                            }
                            hint="Weight on the “facts match the source” noul."
                          />
                          <Threshold
                            label="How much complete matters"
                            value={agent.weightComplete}
                            onChange={(n) =>
                              patchSelected({ weightComplete: n })
                            }
                            hint="Weight on whether obligations look complete."
                          />
                          <Threshold
                            label="How much actionable matters"
                            value={agent.weightActionable}
                            onChange={(n) =>
                              patchSelected({ weightActionable: n })
                            }
                            hint="Weight on whether next actions are clear."
                          />
                          <Threshold
                            label="How much overall quality score matters"
                            value={agent.weightOverall}
                            onChange={(n) =>
                              patchSelected({ weightOverall: n })
                            }
                            hint="Weight on Jev’s graded quality Score."
                          />
                          <p className="text-xs text-[var(--ink-mute)]">
                            Weights are renormalized when scoring. On an item
                            page, Recompute applies new weights without calling
                            Jev again.
                          </p>
                        </>
                      )}
                    {selected === "hazard" && "blockSeverityAbove" in agent && (
                      <>
                        <Threshold
                          label="Block export if harm severity ≥ (0–4 scale)"
                          value={agent.blockSeverityAbove / 4}
                          onChange={(n) =>
                            patchSelected({ blockSeverityAbove: n * 4 })
                          }
                          hint={`Current cutoff: ${agent.blockSeverityAbove.toFixed(2)} / 4. Slider is normalized 0–1 for editing.`}
                        />
                        <Threshold
                          label="Send to review if harm severity ≥"
                          value={agent.reviewSeverityAbove / 4}
                          onChange={(n) =>
                            patchSelected({ reviewSeverityAbove: n * 4 })
                          }
                          hint={`Current cutoff: ${agent.reviewSeverityAbove.toFixed(2)} / 4.`}
                        />
                        <Threshold
                          label="Also block if any hazard probability ≥"
                          value={agent.hazardNoulBlock}
                          onChange={(n) =>
                            patchSelected({ hazardNoulBlock: n })
                          }
                          hint="Max of hazard nouls (overclaim, PII leak, etc.)."
                        />
                      </>
                    )}
                    {selected === "playbook" && "coveredThreshold" in agent && (
                      <Threshold
                        label="Checklist step counts as covered if ≥"
                        value={agent.coveredThreshold}
                        onChange={(n) =>
                          patchSelected({ coveredThreshold: n })
                        }
                        hint="Jev noul that the source evidences that playbook step."
                      />
                    )}
                    {selected === "dedupe" && (
                      <p className="text-sm text-[var(--ink-mute)]">
                        When enabled, Jev scores obligation pairs as same,
                        related, or different. Review can merge suggested
                        duplicates before export.
                      </p>
                    )}
                    {selected === "gate" && "autoApproveAbove" in agent && (
                      <>
                        <Threshold
                          label="Auto-approve if package score ≥"
                          value={agent.autoApproveAbove}
                          onChange={(n) =>
                            patchSelected({ autoApproveAbove: n })
                          }
                          hint="Composite confidence from the Confidence agent."
                        />
                        <Threshold
                          label="Human review if score ≥ (else needs work)"
                          value={agent.humanConfirmAbove}
                          onChange={(n) =>
                            patchSelected({ humanConfirmAbove: n })
                          }
                          hint="Below this → needs_work. Between this and auto-approve → pending_review."
                        />
                        <label className="flex items-center gap-2 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={agent.forceConfirmOnUncertain}
                            onChange={(e) =>
                              patchSelected({
                                forceConfirmOnUncertain: e.target.checked,
                              })
                            }
                          />
                          Always require a human when any step is uncertain
                        </label>
                      </>
                    )}
                    {selected === "router" && "routineCategories" in agent && (
                      <>
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
                        <label className="flex items-center gap-2 text-sm font-semibold">
                          <input
                            type="checkbox"
                            checked={agent.preferCoarseForRouting}
                            onChange={(e) =>
                              patchSelected({
                                preferCoarseForRouting: e.target.checked,
                              })
                            }
                          />
                          Prefer coarse taxonomy when unsure
                        </label>
                      </>
                    )}
                  </div>
                </Card>

                <Card>
                  <SectionTitle eyebrow="Runtime">Where it runs in code</SectionTitle>
                  <p className="mt-1 text-xs text-[var(--ink-mute)]">
                    Jev calls go through TypeSafe System One (`jev-latest`). Azure
                    only drafts text after the guardrail passes.
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-[var(--ink-2)]">
                    {selected === "guardrail" && (
                      <>
                        <li>
                          <code className="font-mono text-xs">lib/redact.ts</code>{" "}
                          — strip PII with regex before any model sees the text
                        </li>
                        <li>
                          <code className="font-mono text-xs">
                            lib/jev.ts#jevGuardrail
                          </code>{" "}
                          — orchestrates block / pass
                        </li>
                        <li>
                          <code className="font-mono text-xs">
                            lib/typesafe.ts#typesafeTriage
                          </code>{" "}
                          — Jev injection yes/no probability
                        </li>
                      </>
                    )}
                    {selected === "triage" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/typesafe.ts#typesafeTriage
                        </code>{" "}
                        — Choices (category / urgency / jurisdiction) + escalate
                        noul
                      </li>
                    )}
                    {selected === "router" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/jev.ts#routeDecision
                        </code>{" "}
                        — rules over triage numbers (no new Jev call)
                      </li>
                    )}
                    {selected === "draft" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/jev.ts#extractObligations / draftMemo
                        </code>{" "}
                        — Azure writes; Jev may verify fields / dates
                      </li>
                    )}
                    {selected === "dedupe" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/typesafe.ts#typesafeDedupeObligations
                        </code>
                      </li>
                    )}
                    {selected === "grounding" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/typesafe.ts#typesafeGroundObligations
                        </code>{" "}
                        — locate quote + citation Choice
                      </li>
                    )}
                    {selected === "playbook" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/typesafe.ts#typesafePlaybookCoverage
                        </code>
                      </li>
                    )}
                    {selected === "hazard" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/typesafe.ts#typesafeMemoHazard
                        </code>
                      </li>
                    )}
                    {selected === "confidence" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/typesafe.ts#typesafeConfidence
                        </code>{" "}
                        — grounded / complete / actionable + quality Score
                      </li>
                    )}
                    {selected === "gate" && (
                      <li>
                        <code className="font-mono text-xs">
                          lib/jev.ts#gateDecision
                        </code>{" "}
                        — deterministic bands on the package score
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
        </div>
      )}
    </div>
  );
}
