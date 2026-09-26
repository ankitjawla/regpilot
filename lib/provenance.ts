// Examiner provenance — policy version + structured System One judgments ledger.

import type { PolicyPresetId } from "./agents";
import type { BandedChoice, BandedNoul, NoulBand, ChoiceBand } from "./bands";
import type {
  ObligationGrounding,
  TypesafeGroundingResult,
  TypesafeTriageAnswers,
  MemoHazardResult,
  PlaybookCoverageResult,
  ObligationDedupeResult,
  DueDateExtraction,
  CitationVerdict,
} from "./typesafe";
import type { TaxonomyResult, BeamClassifyResult } from "./taxonomy";
import { bandNoul, bandChoice, type BandConfig } from "./bands";

export type JudgmentChoice = {
  choice: string;
  confidence: number;
  probabilities?: Record<string, number>;
  band?: ChoiceBand;
};

export type TriageJudgments = {
  model?: string;
  injectionNoul?: number;
  injectionBand?: NoulBand;
  escalateNoul?: number;
  escalateBand?: NoulBand;
  category?: JudgmentChoice;
  urgency?: JudgmentChoice;
  jurisdiction?: JudgmentChoice;
  taxonomy?: TaxonomyResult;
  beam?: BeamClassifyResult;
  anyUncertain?: boolean;
};

export type GroundingJudgments = {
  model?: string;
  overallSupported: number;
  inventedClaims: number;
  unsupportedCount: number;
  softFail?: boolean;
  needsReview?: boolean;
  verdictCounts?: Partial<Record<CitationVerdict, number>>;
  obligations?: ObligationGrounding[];
};

export type ConfidenceJudgments = {
  model?: string;
  score: number;
  reasons: string[];
  /** Raw nouls for weight recomputation without re-inference. */
  groundedNoul?: number;
  completeNoul?: number;
  actionableNoul?: number;
  overallScore?: number;
  overallConfidence?: number;
  weights?: {
    weightGrounded: number;
    weightComplete: number;
    weightActionable: number;
    weightOverall: number;
  };
};

export type HazardJudgments = MemoHazardResult;

export type PlaybookJudgments = PlaybookCoverageResult;

export type DedupeJudgments = ObligationDedupeResult;

export type DueDateJudgments = {
  extractions: DueDateExtraction[];
  anyNeedsReview: boolean;
};

export type CascadeJudgments = {
  rung: "small" | "big" | "skipped";
  verified: boolean;
  anyFire?: boolean;
  model?: string;
};

/** Structured judgments stamped onto each item for detail/export/audit. */
export type ItemJudgments = {
  triage?: TriageJudgments;
  grounding?: GroundingJudgments;
  confidence?: ConfidenceJudgments;
  hazard?: HazardJudgments;
  playbook?: PlaybookJudgments;
  dedupe?: DedupeJudgments;
  dueDates?: DueDateJudgments;
  cascade?: CascadeJudgments;
};

export type ItemProvenance = {
  policy_version: number | null;
  preset: PolicyPresetId | "custom" | string | null;
  judgments: ItemJudgments | null;
};

function choiceSnapshot(
  c: {
    choice: string;
    confidence: number;
    probabilities?: Record<string, number>;
  },
  bandCfg?: Pick<BandConfig, "choiceMinConfidence">
): JudgmentChoice {
  const b = bandChoice(c.choice, c.confidence, bandCfg, c.probabilities);
  return {
    choice: b.choice,
    confidence: b.confidence,
    probabilities: b.probabilities,
    band: b.band,
  };
}

/** Build triage judgment slice from TypeSafe System One answers (+ bands). */
export function triageJudgmentsFromTypesafe(
  ts: TypesafeTriageAnswers,
  opts?: {
    bandCfg?: BandConfig;
    taxonomy?: TaxonomyResult;
    beam?: BeamClassifyResult;
  }
): TriageJudgments {
  const bandCfg = opts?.bandCfg;
  const inj: BandedNoul = bandNoul(ts.injection.noul, bandCfg);
  const esc: BandedNoul = bandNoul(ts.escalate.noul, bandCfg);
  const category = choiceSnapshot(ts.category, bandCfg);
  const urgency = choiceSnapshot(ts.urgency, bandCfg);
  const jurisdiction = choiceSnapshot(ts.jurisdiction, bandCfg);
  const anyUncertain =
    inj.band === "uncertain" ||
    esc.band === "uncertain" ||
    category.band === "uncertain" ||
    urgency.band === "uncertain" ||
    jurisdiction.band === "uncertain";
  return {
    model: ts.model,
    injectionNoul: inj.noul,
    injectionBand: inj.band,
    escalateNoul: esc.noul,
    escalateBand: esc.band,
    category,
    urgency,
    jurisdiction,
    taxonomy: opts?.taxonomy,
    beam: opts?.beam,
    anyUncertain,
  };
}

/** Build grounding judgment slice (optionally with soft-fail flag). */
export function groundingJudgmentsFromResult(
  g: TypesafeGroundingResult,
  softFail?: boolean
): GroundingJudgments {
  return {
    model: g.model,
    overallSupported: g.overallSupported,
    inventedClaims: g.inventedClaims,
    unsupportedCount: g.unsupportedCount,
    softFail: softFail ?? false,
    needsReview: g.needsReview,
    verdictCounts: g.verdictCounts,
    obligations: g.obligations,
  };
}

export function confidenceJudgmentsFromScore(c: {
  score: number;
  reasons: string[];
  model?: string;
  groundedNoul?: number;
  completeNoul?: number;
  actionableNoul?: number;
  overallScore?: number;
  overallConfidence?: number;
  weights?: ConfidenceJudgments["weights"];
}): ConfidenceJudgments {
  return {
    model: c.model,
    score: c.score,
    reasons: c.reasons.slice(0, 8),
    groundedNoul: c.groundedNoul,
    completeNoul: c.completeNoul,
    actionableNoul: c.actionableNoul,
    overallScore: c.overallScore,
    overallConfidence: c.overallConfidence,
    weights: c.weights,
  };
}

/** Shallow-merge judgment sections (later stages overwrite their own keys). */
export function mergeJudgments(
  existing: ItemJudgments | null | undefined,
  patch: ItemJudgments
): ItemJudgments {
  return {
    ...(existing || {}),
    ...patch,
    triage: patch.triage ?? existing?.triage,
    grounding: patch.grounding ?? existing?.grounding,
    confidence: patch.confidence ?? existing?.confidence,
    hazard: patch.hazard ?? existing?.hazard,
    playbook: patch.playbook ?? existing?.playbook,
    dedupe: patch.dedupe ?? existing?.dedupe,
    dueDates: patch.dueDates ?? existing?.dueDates,
    cascade: patch.cascade ?? existing?.cascade,
  };
}

/** Parse jsonb from Postgres (object or JSON string). */
export function parseJudgments(raw: unknown): ItemJudgments | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as ItemJudgments;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as ItemJudgments;
  return null;
}
