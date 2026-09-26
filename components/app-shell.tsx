"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const PRIMARY = [
  { href: "/", label: "Overview", hint: "Pipeline pulse" },
  { href: "/intake", label: "Intake", hint: "Triage & draft" },
  { href: "/review", label: "Review", hint: "Human gate" },
  { href: "/workflow", label: "Workflow", hint: "How it runs" },
  { href: "/agents", label: "Agents", hint: "Edit policy" },
  { href: "/settings", label: "Settings", hint: "Presets & prompts" },
  { href: "/audit", label: "Audit", hint: "Decision trail" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState<number | null>(null);
  const [health, setHealth] = useState<{
    typesafe?: boolean;
    model?: string | null;
  } | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.pendingCount === "number") setPending(d.pendingCount);
      })
      .catch(() => {});
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) =>
        setHealth({
          typesafe: Boolean(d.services?.typesafe?.configured),
          model: d.services?.typesafe?.model ?? null,
        })
      )
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="rp-shell md:flex">
      <aside className="rp-rail w-full shrink-0 px-4 py-4 md:sticky md:top-0 md:flex md:h-screen md:w-[17.5rem] md:flex-col md:px-5 md:py-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="rp-brand-mark mt-0.5" aria-hidden />
          <div>
            <div className="font-display text-[1.35rem] leading-none tracking-[-0.02em] text-[var(--ink)]">
              RegPilot
            </div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ink-mute)]">
              Examination console
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-[var(--line)] bg-white/70 px-3 py-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
            Decision stack
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--ink)]">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                health == null
                  ? "bg-[var(--ink-mute)]"
                  : health.typesafe
                    ? "bg-[var(--sage)]"
                    : "bg-[var(--amber)]"
              }`}
            />
            <span className="font-medium">
              {health == null
                ? "Checking stack…"
                : health.typesafe
                  ? `TypeSafe ${health.model || "jev-latest"}`
                  : "TypeSafe offline"}
            </span>
          </div>
          <div className="mt-0.5 pl-3.5 font-mono text-[10px] text-[var(--ink-mute)]">
            Azure gpt-5.4 · Neon audit
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {PRIMARY.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== "/" && pathname.startsWith(l.href + "/"));
            const showBadge = l.href === "/review" && pending != null && pending > 0;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`group flex min-w-[7.5rem] items-center justify-between rounded-xl px-3 py-2.5 transition-colors md:min-w-0 ${
                  active
                    ? "bg-[var(--ink)] text-white shadow-[var(--shadow)]"
                    : "text-[var(--ink-2)] hover:bg-white/80"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold">{l.label}</span>
                  <span
                    className={`block text-[11px] ${
                      active ? "text-white/65" : "text-[var(--ink-mute)]"
                    }`}
                  >
                    {l.hint}
                  </span>
                </span>
                {showBadge && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                      active
                        ? "bg-white/15 text-white"
                        : "bg-[var(--amber-soft)] text-[var(--amber)]"
                    }`}
                  >
                    {pending}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden pt-6 md:block">
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-white/50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mute)]">
              Operator note
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-2)]">
              System One decides. Azure drafts. Humans clear. Every step is
              written to the audit ledger.
            </p>
            <Link
              href="/intake"
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[var(--sage)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0d655e]"
            >
              Start intake
            </Link>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-7">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
