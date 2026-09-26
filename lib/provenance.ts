// Examiner provenance — policy version + structured System One judgments ledger.

import type { PolicyPresetId } from "./agents";
import type {
  ObligationGrounding,
  TypesafeGroundingResult,
  TypesafeTriageAnswers,
} from "./typesafe";

export type JudgmentChoice = {
  choice: string;
  confidence: number;
  probabilities?: Record<string, number>;
};

export type TriageJudgments = {
  model?: string;
  injectionNoul?: number;
  escalateNoul?: number;
  category?: JudgmentChoice;
  urgency?: JudgmentChoice;
  jurisdiction?: JudgmentChoice;
};

export type GroundingJudgments = {
  model?: string;
  overallSupported: number;
  inventedClaims: number;
  unsupportedCount: number;
  softFail?: boolean;
  obligations?: ObligationGrounding[];
};

export type ConfidenceJudgments = {
  model?: string;
  score: number;
  reasons: string[];
};

/** Structured judgments stamped onto each item for detail/export/audit. */
export type ItemJudgments = {
  triage?: TriageJudgments;
  grounding?: GroundingJudgments;
  confidence?: ConfidenceJudgments;
};

export type ItemProvenance = {
  policy_version: number | null;
  preset: PolicyPresetId | "custom" | string | null;
  judgments: ItemJudgments | null;
};

function choiceSnapshot(c: {
  choice: string;
  confidence: number;
  probabilities?: Record<string, number>;
}): JudgmentChoice {
  return {
    choice: c.choice,
    confidence: c.confidence,
    probabilities: c.probabilities,
  };
}

/** Build triage judgment slice from TypeSafe System One answers. */
export function triageJudgmentsFromTypesafe(
  ts: TypesafeTriageAnswers
): TriageJudgments {
  return {
    model: ts.model,
    injectionNoul: ts.injection.noul,
    escalateNoul: ts.escalate.noul,
    category: choiceSnapshot(ts.category),
    urgency: choiceSnapshot(ts.urgency),
    jurisdiction: choiceSnapshot(ts.jurisdiction),
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
    obligations: g.obligations,
  };
}

export function confidenceJudgmentsFromScore(c: {
  score: number;
  reasons: string[];
  model?: string;
}): ConfidenceJudgments {
  return {
    model: c.model,
    score: c.score,
    reasons: c.reasons.slice(0, 8),
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
