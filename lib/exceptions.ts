// Gate exceptions for the review desk. Built from judgments already stored
// on the item so an examiner sees why the item stopped, next to a source line.

import type { ItemJudgments } from "@/lib/provenance";

export type ExceptionKind =
  | "grounding"
  | "playbook"
  | "hazard"
  | "due_date"
  | "uncertain";

export type ExceptionSeverity = "block" | "confirm";

export type GateException = {
  id: string;
  kind: ExceptionKind;
  severity: ExceptionSeverity;
  title: string;
  detail: string;
  /** Text to send to line-find. Present when the source can answer it. */
  quote?: string;
};

export type ExceptionObligation = {
  owner?: string | null;
  action?: string | null;
  due_date?: string | null;
  source_quote?: string | null;
  needs_review?: boolean | null;
};

const CITATION_VERDICTS = ["unsupported", "contradicted", "fabricated"] as const;

function clip(text: string, max = 180): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}

function quoteFor(
  obligations: ExceptionObligation[],
  index: number
): string | undefined {
  const row = obligations[index];
  const quote = row?.source_quote?.trim();
  if (quote) return clip(quote, 240);
  const action = row?.action?.trim();
  return action ? clip(action, 240) : undefined;
}

/**
 * Reasons the gate asked a human to look. Empty means nothing in the stored
 * judgments was flagged.
 */
export function gateExceptions(input: {
  judgments?: ItemJudgments | null;
  obligations?: ExceptionObligation[];
}): GateException[] {
  const judgments = input.judgments ?? null;
  const obligations = input.obligations ?? [];
  const out: GateException[] = [];

  const grounding = judgments?.grounding;
  const grounded = grounding?.obligations ?? [];
  if (grounded.length) {
    grounded.forEach((row, index) => {
      const verdict = row.verdict;
      const badVerdict =
        verdict != null &&
        (CITATION_VERDICTS as readonly string[]).includes(verdict);
      const weak = row.supported === false || row.needsHumanConfirm === true;
      if (!badVerdict && !weak) return;
      const fabricated = verdict === "fabricated" || verdict === "contradicted";
      const title = badVerdict
        ? `Citation ${verdict}`
        : row.needsHumanConfirm
          ? "Citation needs confirm"
          : "Citation weak";
      out.push({
        id: `grounding-${index}`,
        kind: "grounding",
        severity: fabricated ? "block" : "confirm",
        title,
        detail: clip(
          `${row.owner || obligations[index]?.owner || "Owner"}: ${row.action || obligations[index]?.action || "obligation"}`
        ),
        quote: quoteFor(obligations, row.index ?? index),
      });
    });
  } else if (grounding?.needsReview || grounding?.softFail) {
    out.push({
      id: "grounding-overall",
      kind: "grounding",
      severity: "confirm",
      title: grounding.softFail ? "Grounding soft-fail" : "Grounding needs review",
      detail:
        typeof grounding.overallSupported === "number"
          ? `supported ${Math.round(grounding.overallSupported * 100)}%`
          : "Citation check asked for a person",
    });
  }

  const missing = judgments?.playbook?.missingSteps ?? [];
  missing.forEach((step, index) => {
    const text = step.trim();
    if (!text) return;
    out.push({
      id: `playbook-${index}`,
      kind: "playbook",
      severity: "confirm",
      title: "Playbook gap",
      detail: clip(text),
      quote: clip(text, 240),
    });
  });

  const hazard = judgments?.hazard;
  if (hazard && hazard.disposition && hazard.disposition !== "pass") {
    const noul = (n: number | undefined) =>
      typeof n === "number" ? n.toFixed(2) : "—";
    const signals = [
      `injection ${noul(hazard.injectionNoul)}`,
      `pii ${noul(hazard.piiLeakNoul)}`,
      `speculative ${noul(hazard.speculativeAdviceNoul)}`,
      `severity ${noul(hazard.severityScore)}`,
    ];
    out.push({
      id: "hazard",
      kind: "hazard",
      severity: hazard.disposition === "block" ? "block" : "confirm",
      title: `Hazard ${hazard.disposition}`,
      detail: signals.join(" · "),
    });
  }

  const extractions = judgments?.dueDates?.extractions ?? [];
  const flaggedDates = new Set<number>();
  extractions.forEach((row) => {
    if (!row.needs_review) return;
    flaggedDates.add(row.obligationIndex);
    out.push({
      id: `due-${row.obligationIndex}`,
      kind: "due_date",
      severity: "confirm",
      title: "Due date needs review",
      detail: clip(row.note || obligations[row.obligationIndex]?.due_date || "Unparsed date"),
      quote: quoteFor(obligations, row.obligationIndex),
    });
  });
  obligations.forEach((row, index) => {
    if (!row.needs_review || flaggedDates.has(index)) return;
    out.push({
      id: `due-row-${index}`,
      kind: "due_date",
      severity: "confirm",
      title: "Due date needs review",
      detail: clip(`${row.owner || "Owner"}: ${row.due_date || "no date"}`),
      quote: quoteFor(obligations, index),
    });
  });

  const triage = judgments?.triage;
  if (triage) {
    const fields: { id: string; label: string; detail: string }[] = [];
    if (triage.injectionBand === "uncertain") {
      fields.push({
        id: "injection",
        label: "Uncertain injection",
        detail:
          triage.injectionNoul != null
            ? `noul ${triage.injectionNoul.toFixed(2)}`
            : "mid band",
      });
    }
    if (triage.escalateBand === "uncertain") {
      fields.push({
        id: "escalate",
        label: "Uncertain escalate",
        detail:
          triage.escalateNoul != null
            ? `noul ${triage.escalateNoul.toFixed(2)}`
            : "mid band",
      });
    }
    for (const key of ["category", "urgency", "jurisdiction"] as const) {
      const choice = triage[key];
      if (choice?.band !== "uncertain") continue;
      fields.push({
        id: key,
        label: `Uncertain ${key}`,
        detail: `${choice.choice} · ${choice.confidence.toFixed(2)}`,
      });
    }
    if (!fields.length && triage.anyUncertain) {
      fields.push({
        id: "triage",
        label: "Uncertain triage",
        detail: "A Jev band landed in the middle",
      });
    }
    for (const field of fields) {
      out.push({
        id: `uncertain-${field.id}`,
        kind: "uncertain",
        severity: "confirm",
        title: field.label,
        detail: field.detail,
      });
    }
  }

  return out;
}

/** Short audit line so approve/needs-work records what was on the desk. */
export function exceptionAuditLine(list: GateException[]): string {
  if (!list.length) return "Saw no gate exceptions";
  const titles = list.map((e) => e.title).slice(0, 8);
  const extra = list.length > titles.length ? ` +${list.length - titles.length}` : "";
  return `Saw ${list.length}: ${titles.join("; ")}${extra}`;
}
