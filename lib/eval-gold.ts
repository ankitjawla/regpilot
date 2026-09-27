// Score labeled samples on the decisions that change an exam: category,
// block (PII / injection / hazard), and whether a human confirm is required.

export type SampleGold = {
  category: string;
  shouldBlock: boolean;
  shouldConfirm: boolean;
};

export type GateGoldScore = {
  id: string;
  categoryHit: boolean;
  blockPredicted: boolean;
  blockHit: boolean;
  confirmPredicted: boolean;
  confirmHit: boolean;
};

export function scoreGateGold(input: {
  id: string;
  gold: SampleGold;
  category: string;
  categoryBand: string;
  injectionNoul: number;
  injectionBlockThreshold: number;
  escalateNoul: number;
  escalateFullPathThreshold: number;
  piiFound: boolean;
  hazardDisposition: "pass" | "review" | "block" | null;
}): GateGoldScore {
  const blockPredicted =
    input.piiFound ||
    input.injectionNoul >= input.injectionBlockThreshold ||
    input.hazardDisposition === "block";
  const confirmPredicted =
    !blockPredicted &&
    (input.hazardDisposition === "review" ||
      input.escalateNoul >= input.escalateFullPathThreshold ||
      input.categoryBand === "uncertain");
  return {
    id: input.id,
    categoryHit: input.category === input.gold.category,
    blockPredicted,
    blockHit: blockPredicted === input.gold.shouldBlock,
    confirmPredicted,
    confirmHit: confirmPredicted === input.gold.shouldConfirm,
  };
}

export function gateGoldSuggestions(
  rows: GateGoldScore[],
  thresholds: { injectionBlockThreshold: number; escalateFullPathThreshold: number }
): string[] {
  if (!rows.length) return [];
  const categoryHits = rows.filter((r) => r.categoryHit).length;
  const blockHits = rows.filter((r) => r.blockHit).length;
  const confirmHits = rows.filter((r) => r.confirmHit).length;
  const n = rows.length;
  const lines = [
    `Gate labels ${n}: category ${categoryHits}/${n}, block ${blockHits}/${n}, confirm ${confirmHits}/${n}.`,
  ];
  if (blockHits < n) {
    lines.push(
      `Block misses a labeled sample — check guardrail.injectionBlockThreshold (now ${thresholds.injectionBlockThreshold.toFixed(2)}) and the hazard block rule.`
    );
  }
  if (confirmHits < n) {
    lines.push(
      `Confirm misses a labeled sample — check triage.escalateFullPathThreshold (now ${thresholds.escalateFullPathThreshold.toFixed(2)}). A routine letter should stay under it; an MRA should clear it.`
    );
  }
  if (categoryHits < n) {
    lines.push(
      "Category misses a labeled sample — the Choice label did not match the gold category."
    );
  }
  return lines;
}
