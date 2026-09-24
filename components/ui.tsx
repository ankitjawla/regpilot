import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">{children}</h2>;
}

const tone: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  slate: "bg-slate-100 text-slate-700",
  purple: "bg-violet-100 text-violet-800",
};

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: keyof typeof tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone[color]}`}>
      {children}
    </span>
  );
}

const statusColor: Record<string, "green" | "amber" | "red" | "slate" | "blue"> = {
  auto_approved: "green",
  approved: "green",
  pending_review: "amber",
  needs_work: "red",
  triaged: "blue",
  blocked: "red",
};

const statusLabel: Record<string, string> = {
  auto_approved: "Auto-approved",
  approved: "Approved",
  pending_review: "Pending review",
  needs_work: "Needs work",
  triaged: "Triaged",
  blocked: "Blocked",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge color={statusColor[status] || "slate"}>{statusLabel[status] || status}</Badge>;
}

export function ConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) return <Badge color="slate">—</Badge>;
  const color = score > 0.9 ? "green" : score >= 0.5 ? "amber" : "red";
  return <Badge color={color}>{score.toFixed(2)}</Badge>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-stone-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-stone-500">{sub}</div>}
    </Card>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const color =
    urgency === "critical" ? "red" : urgency === "high" ? "amber" : urgency === "medium" ? "blue" : "slate";
  return <Badge color={color}>{urgency}</Badge>;
}
