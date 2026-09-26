"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, SectionTitle, Badge, PageHeader } from "@/components/ui";
import type { AgentConfig, PolicyPresetId } from "@/lib/agents";

type PresetInfo = { id: string; label: string; description: string };

export default function SettingsPage() {
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [presets, setPresets] = useState<PresetInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [dirty, setDirty] = useState(false);

  async function load() {
    const r = await fetch("/api/agents");
    const d = await r.json();
    setConfig(d.config);
    setPresets(d.presets || []);
    setDirty(false);
  }

  useEffect(() => {
    load().catch(() => setError("Could not load settings."));
  }, []);

  function patchConsole(patch: Partial<AgentConfig["console"]>) {
    if (!config) return;
    setConfig({
      ...config,
      preset: "custom",
      console: { ...config.console, ...patch },
    });
    setDirty(true);
    setSaved("");
  }

  function patchDraft(patch: Partial<AgentConfig["draft"]>) {
    if (!config) return;
    setConfig({
      ...config,
      preset: "custom",
      draft: { ...config.draft, ...patch },
    });
    setDirty(true);
    setSaved("");
  }

  async function applyPreset(id: Exclude<PolicyPresetId, "custom">) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Preset failed");
      setConfig(d.config);
      setDirty(false);
      setSaved(`Applied ${id} preset · v${d.config.version}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
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

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Customize console branding, policy presets, memo sections, and Azure draft prompts. Changes apply on the next pipeline run."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/agents"
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[var(--paper-2)]"
            >
              Agent thresholds
            </Link>
            <button
              type="button"
              onClick={save}
              disabled={busy || !dirty}
              className="rounded-xl bg-[var(--sage)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save settings"}
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
          <p className="text-sm text-[var(--ink-mute)]">Loading…</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <SectionTitle eyebrow="Policy">Presets</SectionTitle>
            <p className="mb-3 text-xs text-[var(--ink-mute)]">
              Active: <Badge color="slate">{config.preset}</Badge>
              {dirty ? " · unsaved custom edits" : ""}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    applyPreset(p.id as Exclude<PolicyPresetId, "custom">)
                  }
                  className={`rounded-xl border p-3 text-left transition ${
                    config.preset === p.id
                      ? "border-[var(--sage)] bg-[var(--sage-soft)]/40"
                      : "border-[var(--line)] bg-[var(--paper-2)] hover:bg-white"
                  }`}
                >
                  <div className="text-sm font-semibold">{p.label}</div>
                  <p className="mt-1 text-xs text-[var(--ink-mute)]">
                    {p.description}
                  </p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Console">Branding & export</SectionTitle>
            <div className="mt-3 grid gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--ink-mute)]">
                  Organization name
                </span>
                <input
                  value={config.console.orgName}
                  onChange={(e) => patchConsole({ orgName: e.target.value })}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 text-sm outline-none ring-[var(--sage)] focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--ink-mute)]">
                  Export title prefix
                </span>
                <input
                  value={config.console.exportTitlePrefix}
                  onChange={(e) =>
                    patchConsole({ exportTitlePrefix: e.target.value })
                  }
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 text-sm outline-none ring-[var(--sage)] focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--ink-mute)]">
                  Export footer
                </span>
                <textarea
                  value={config.console.exportFooter}
                  onChange={(e) => patchConsole({ exportFooter: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 text-sm outline-none ring-[var(--sage)] focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-[var(--ink-mute)]">
                  Memo sections (one per line; injected into draft prompt)
                </span>
                <textarea
                  value={config.console.memoSections}
                  onChange={(e) =>
                    patchConsole({ memoSections: e.target.value })
                  }
                  rows={5}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 font-mono text-xs outline-none ring-[var(--sage)] focus:ring-2"
                />
              </label>
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Azure draft">System prompts</SectionTitle>
            <p className="mb-3 text-xs text-[var(--ink-mute)]">
              Use <code className="font-mono">{"{{MEMO_SECTIONS}}"}</code> in the
              memo prompt to insert the sections above.
            </p>
            <label className="mb-3 block">
              <span className="mb-1 block text-xs font-semibold text-[var(--ink-mute)]">
                Obligation extraction prompt
              </span>
              <textarea
                value={config.draft.obligationSystemPrompt}
                onChange={(e) =>
                  patchDraft({ obligationSystemPrompt: e.target.value })
                }
                rows={6}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 font-mono text-xs outline-none ring-[var(--sage)] focus:ring-2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--ink-mute)]">
                Memo draft prompt
              </span>
              <textarea
                value={config.draft.memoSystemPrompt}
                onChange={(e) =>
                  patchDraft({ memoSystemPrompt: e.target.value })
                }
                rows={6}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2.5 font-mono text-xs outline-none ring-[var(--sage)] focus:ring-2"
              />
            </label>
          </Card>
        </div>
      )}
    </div>
  );
}
