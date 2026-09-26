// Post-draft TypeSafe cookbook enhancements shared by pipeline + analyze.

import type { AgentConfig } from "./agents";
import type { Obligation, ConfidenceScore, CascadeMeta } from "./jev";
import { playbookForText } from "./playbooks";
import type { ItemJudgments } from "./provenance";
import {
  typesafeConfigured,
  typesafeGroundObligations,
  typesafeExtractDueDates,
  typesafePlaybookCoverage,
  typesafeMemoHazard,
  typesafeDedupeObligations,
  typesafeBeamClassify,
} from "./typesafe";
import { applyCoarseFallback, type FineCategory } from "./taxonomy";
import {
  groundingJudgmentsFromResult,
  type TriageJudgments,
} from "./provenance";
import type { BandConfig } from "./bands";
import type { Triage } from "./jev";

export type EnhanceContext = {
  source: string;
  title: string;
  memo: string;
  obligations: Obligation[];
  triage: Triage;
  agentCfg: AgentConfig;
  cascade?: CascadeMeta | null;
  existingJudgments?: ItemJudgments | null;
};

export type EnhanceResult = {
  obligations: Obligation[];
  judgments: ItemJudgments;
  confidencePatch: {
    softCap?: number;
    reasons: string[];
    forceConfirm: boolean;
    hazardDisposition?: "pass" | "review" | "block";
    anyUncertain: boolean;
    dueDateNeedsReview: boolean;
    groundingNeedsReview: boolean;
  };
  grounding: ReturnType<typeof groundingPayload> | null;
};

function groundingPayload(
  g: Awaited<ReturnType<typeof typesafeGroundObligations>>,
  softFail: boolean
) {
  return {
    model: g.model,
    overallSupported: g.overallSupported,
    inventedClaims: g.inventedClaims,
    unsupportedCount: g.unsupportedCount,
    obligations: g.obligations,
    softFail,
    needsReview: g.needsReview,
    verdictCounts: g.verdictCounts,
    latencyMs: g.latencyMs,
  };
}

export function bandCfgFromAgent(cfg: AgentConfig): BandConfig {
  return {
    noulUncertainLow: cfg.triage.noulUncertainLow,
    noulUncertainHigh: cfg.triage.noulUncertainHigh,
    choiceMinConfidence: cfg.triage.choiceMinConfidence,
  };
}

export function taxonomyFromTriage(
  triage: Triage,
  cutoff: number
): ReturnType<typeof applyCoarseFallback> {
  return applyCoarseFallback(
    triage.category as FineCategory,
    triage.confidence,
    cutoff
  );
}

/** Optionally attach beam classify onto triage judgments (best-effort). */
export async function maybeBeamClassify(
  text: string,
  enabled: boolean
): Promise<ItemJudgments["triage"] extends { beam?: infer B } ? B : never> {
  if (!enabled || !typesafeConfigured()) return null as never;
  try {
    return (await typesafeBeamClassify({ text })) as never;
  } catch (e) {
    console.error(
      "[enhance] beam classify unavailable:",
      (e as Error).message?.slice(0, 100)
    );
    return null as never;
  }
}

/**
 * Run due-date extract, dedupe, grounding, playbook coverage, hazard.
 * Mutates confidence via returned softCap/reasons; caller applies gate.
 */
export async function runPostDraftEnhancements(
  ctx: EnhanceContext
): Promise<EnhanceResult> {
  const { agentCfg, source, memo, triage, title } = ctx;
  let obligations = [...ctx.obligations];
  const judgments: ItemJudgments = { ...(ctx.existingJudgments || {}) };
  const reasons: string[] = [];
  let softCap: number | undefined;
  let forceConfirm = false;
  let hazardDisposition: "pass" | "review" | "block" | undefined;
  let dueDateNeedsReview = false;
  let groundingNeedsReview = false;
  let grounding: EnhanceResult["grounding"] = null;

  if (ctx.cascade) {
    judgments.cascade = ctx.cascade;
  }

  // --- due dates
  if (
    agentCfg.draft.dueDateExtractEnabled &&
    typesafeConfigured() &&
    obligations.length > 0
  ) {
    try {
      const extractions = await typesafeExtractDueDates({
        source,
        obligations,
        reviewBelow: agentCfg.draft.dueDateReviewBelow,
        limit: 4,
      });
      for (const ex of extractions) {
        const o = obligations[ex.obligationIndex];
        if (!o) continue;
        o.due_date_iso = ex.due_date_iso;
        o.date_confidence = ex.date_confidence;
        o.needs_review = ex.needs_review;
        o.date_note = ex.note;
        if (ex.due_date_iso && o.due_date === "unspecified") {
          o.due_date = ex.due_date_iso;
        }
      }
      dueDateNeedsReview = extractions.some((e) => e.needs_review);
      judgments.dueDates = { extractions, anyNeedsReview: dueDateNeedsReview };
      if (dueDateNeedsReview) {
        reasons.push("Due-date extraction flagged for human confirm");
        if (agentCfg.draft.dueDateForceConfirm) forceConfirm = true;
      }
    } catch (e) {
      console.error(
        "[enhance] due-date extract unavailable:",
        (e as Error).message?.slice(0, 100)
      );
    }
  }

  // --- dedupe
  if (
    agentCfg.dedupe.enabled &&
    typesafeConfigured() &&
    obligations.length >= 2
  ) {
    try {
      const dedupe = await typesafeDedupeObligations({ obligations });
      judgments.dedupe = dedupe;
      if (dedupe.mergeSuggestions.length > 0) {
        reasons.push(
          `${dedupe.mergeSuggestions.length} obligation pair(s) suggested for curator merge`
        );
        forceConfirm = true;
      }
    } catch (e) {
      console.error(
        "[enhance] dedupe unavailable:",
        (e as Error).message?.slice(0, 100)
      );
    }
  }

  // --- grounding (citation-grade)
  if (
    agentCfg.grounding.enabled &&
    typesafeConfigured() &&
    obligations.length > 0
  ) {
    try {
      const g = await typesafeGroundObligations({
        source,
        obligations,
        memo,
        autoAcceptConfidence: agentCfg.grounding.citationAutoAccept,
      });
      const softFail =
        g.overallSupported < agentCfg.grounding.supportThreshold ||
        g.inventedClaims > agentCfg.grounding.inventedThreshold ||
        (g.verdictCounts?.contradicted || 0) > 0 ||
        (g.verdictCounts?.fabricated || 0) > 0;
      judgments.grounding = groundingJudgmentsFromResult(g, softFail);
      grounding = groundingPayload(g, softFail);
      groundingNeedsReview = Boolean(g.needsReview);
      if (softFail) {
        softCap = Math.min(softCap ?? 1, 0.49);
        reasons.push(
          `Grounding soft-fail (supported ${g.overallSupported.toFixed(2)}, invented ${g.inventedClaims.toFixed(2)}, verdicts ${JSON.stringify(g.verdictCounts || {})})`
        );
      } else if (g.unsupportedCount > 0) {
        softCap = Math.min(softCap ?? 1, 0.75);
        reasons.push(
          `${g.unsupportedCount} obligation(s) weakly supported / citation review`
        );
      }
      if (groundingNeedsReview) forceConfirm = true;
    } catch (e) {
      console.error(
        "[enhance] grounding unavailable:",
        (e as Error).message?.slice(0, 100)
      );
    }
  }

  // --- playbook coverage
  if (agentCfg.playbook.enabled && typesafeConfigured()) {
    const playbook = playbookForText({
      title,
      category: triage.category,
      source: source.slice(0, 2000),
    });
    if (playbook) {
      try {
        const cov = await typesafePlaybookCoverage({
          source,
          memo,
          obligationsJson: JSON.stringify(obligations),
          playbookId: playbook.id,
          steps: playbook.steps,
          coveredThreshold: agentCfg.playbook.coveredThreshold,
        });
        judgments.playbook = cov;
        if (cov.missingSteps.length > 0) {
          reasons.push(
            `Playbook gaps: ${cov.missingSteps.slice(0, 3).join("; ")}`
          );
        }
      } catch (e) {
        console.error(
          "[enhance] playbook coverage unavailable:",
          (e as Error).message?.slice(0, 100)
        );
      }
    }
  }

  // --- outbound hazard
  if (agentCfg.hazard.enabled && typesafeConfigured() && memo.trim()) {
    try {
      const hazard = await typesafeMemoHazard({
        memo,
        blockSeverityAbove: agentCfg.hazard.blockSeverityAbove,
        reviewSeverityAbove: agentCfg.hazard.reviewSeverityAbove,
        hazardNoulBlock: agentCfg.hazard.hazardNoulBlock,
      });
      judgments.hazard = hazard;
      hazardDisposition = hazard.disposition;
      if (hazard.disposition === "block") {
        softCap = Math.min(softCap ?? 1, 0.2);
        reasons.push("Outbound hazard screen: BLOCK");
      } else if (hazard.disposition === "review") {
        forceConfirm = true;
        reasons.push(
          `Outbound hazard screen: review (severity ${hazard.severityScore.toFixed(2)})`
        );
      }
    } catch (e) {
      console.error(
        "[enhance] hazard screen unavailable:",
        (e as Error).message?.slice(0, 100)
      );
    }
  }

  const anyUncertain = Boolean(judgments.triage?.anyUncertain);

  return {
    obligations,
    judgments,
    confidencePatch: {
      softCap,
      reasons,
      forceConfirm,
      hazardDisposition,
      anyUncertain,
      dueDateNeedsReview,
      groundingNeedsReview,
    },
    grounding,
  };
}

export function applyConfidencePatch<T extends ConfidenceScore>(
  confidence: T,
  patch: EnhanceResult["confidencePatch"]
): T {
  const next = { ...confidence, reasons: [...confidence.reasons] };
  if (patch.softCap != null) {
    next.score = Math.min(next.score, patch.softCap);
  }
  next.reasons.push(...patch.reasons);
  return next;
}

export function enrichTriageJudgments(
  base: TriageJudgments | undefined,
  triage: Triage,
  agentCfg: AgentConfig,
  beam: Awaited<ReturnType<typeof typesafeBeamClassify>> | null
): TriageJudgments | undefined {
  if (!base) return base;
  const taxonomy = taxonomyFromTriage(
    triage,
    agentCfg.triage.coarseTaxonomyCutoff
  );
  return {
    ...base,
    taxonomy,
    beam: beam || undefined,
  };
}
