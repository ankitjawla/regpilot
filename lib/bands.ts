// Uncertainty bands — mid-range nouls / low-confidence choices → explicit "uncertain".
// See docs.typesafe.ai consistency_noul / consistency_choice / confidence-routing.

export type NoulBand = "yes" | "no" | "uncertain";
export type ChoiceBand = "certain" | "uncertain";
export type ConfidenceBand = "high" | "mid" | "low" | "uncertain";

export type BandConfig = {
  /** Noul in [low, high] (inclusive) → uncertain. Defaults 0.30–0.70. */
  noulUncertainLow: number;
  noulUncertainHigh: number;
  /** Choice/Score confidence below this → uncertain. */
  choiceMinConfidence: number;
};

export const DEFAULT_BAND_CONFIG: BandConfig = {
  noulUncertainLow: 0.3,
  noulUncertainHigh: 0.7,
  choiceMinConfidence: 0.55,
};

export function noulBand(
  noul: number,
  cfg: Pick<BandConfig, "noulUncertainLow" | "noulUncertainHigh"> = DEFAULT_BAND_CONFIG
): NoulBand {
  const v = Number.isFinite(noul) ? noul : 0.5;
  if (v >= cfg.noulUncertainLow && v <= cfg.noulUncertainHigh) return "uncertain";
  return v > cfg.noulUncertainHigh ? "yes" : "no";
}

export function choiceBand(
  confidence: number,
  cfg: Pick<BandConfig, "choiceMinConfidence"> = DEFAULT_BAND_CONFIG
): ChoiceBand {
  const c = Number.isFinite(confidence) ? confidence : 0;
  return c >= cfg.choiceMinConfidence ? "certain" : "uncertain";
}

/** Gate-facing band for a composite confidence score. */
export function confidenceBand(
  score: number,
  opts: { autoApproveAbove: number; humanConfirmAbove: number }
): ConfidenceBand {
  if (score > opts.autoApproveAbove) return "high";
  if (score >= opts.humanConfirmAbove) return "mid";
  if (score >= opts.humanConfirmAbove * 0.5) return "low";
  return "uncertain";
}

export type BandedNoul = {
  noul: number;
  band: NoulBand;
};

export type BandedChoice = {
  choice: string;
  confidence: number;
  band: ChoiceBand;
  probabilities?: Record<string, number>;
};

export function bandNoul(
  noul: number,
  cfg?: Pick<BandConfig, "noulUncertainLow" | "noulUncertainHigh">
): BandedNoul {
  return { noul, band: noulBand(noul, cfg) };
}

export function bandChoice(
  choice: string,
  confidence: number,
  cfg?: Pick<BandConfig, "choiceMinConfidence">,
  probabilities?: Record<string, number>
): BandedChoice {
  return {
    choice,
    confidence,
    band: choiceBand(confidence, cfg),
    probabilities,
  };
}

/** True when any listed band is uncertain — forces human confirm at the gate. */
export function anyUncertain(
  bands: Array<NoulBand | ChoiceBand | undefined | null>
): boolean {
  return bands.some((b) => b === "uncertain");
}
