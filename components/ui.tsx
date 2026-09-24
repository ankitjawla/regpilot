import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`rp-panel p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({
  children,
  eyebrow,
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-3">
      {eyebrow && (
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-mute)]">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
        {children}
      </h2>
    </div>
  );
}

const tone: Record<string, string> = {
  blue: "bg-[var(--sky-soft)] text-[var(--sky)]",
  green: "bg-[var(--sage-soft)] text-[var(--sage)]",
  amber: "bg-[var(--amber-soft)] text-[var(--amber)]",
  red: "bg-[var(--coral-soft)] text-[var(--coral)]",
  slate: "bg-[#e8eef4] text-[#3d4b5c]",
  purple: "bg-[#e8e4f5] text-[#4c3d7a]",
};

export function Badge({
  children,
  color = "slate",
}: {
  children: ReactNode;
  color?: keyof typeof tone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${tone[color]}`}
    >
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
  return (
    <Badge color={statusColor[status] || "slate"}>
      {statusLabel[status] || status}
    </Badge>
  );
}

export function ConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) return <Badge color="slate">—</Badge>;
  const color = score > 0.9 ? "green" : score >= 0.5 ? "amber" : "red";
  return <Badge color={color}>{score.toFixed(2)}</Badge>;
}

export function Stat({
  label,
  value,
  sub,
  accent = "sage",
  alert,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: "sage" | "amber" | "coral" | "sky";
  alert?: boolean;
}) {
  const accentGlow =
    accent === "amber"
      ? "from-[rgba(180,83,9,0.14)]"
      : accent === "coral"
        ? "from-[rgba(185,28,28,0.12)]"
        : accent === "sky"
          ? "from-[rgba(3,105,161,0.12)]"
          : "from-[rgba(15,118,110,0.12)]";
  return (
    <div
      className={`rp-panel rp-metric relative overflow-hidden p-4 ${
        alert ? "rp-needs-pulse border-[color-mix(in_srgb,var(--amber)_45%,var(--line))]" : ""
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${accentGlow} to-transparent`}
      />
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-mute)]">
        {label}
      </div>
      <div className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-[var(--ink-mute)]">{sub}</div>}
    </div>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const color =
    urgency === "critical"
      ? "red"
      : urgency === "high"
        ? "amber"
        : urgency === "medium"
          ? "blue"
          : "slate";
  return <Badge color={color}>{urgency}</Badge>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-mute)]">
          RegPilot
        </div>
        <h1 className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em] text-[var(--ink)] md:text-[2.15rem]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--ink-mute)]">
            {subtitle}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}

export function PrimaryButton({
  children,
  href,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const cls =
    "inline-flex items-center justify-center rounded-xl bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--ink-2)] disabled:opacity-50";
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
