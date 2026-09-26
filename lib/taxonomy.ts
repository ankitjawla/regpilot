// Coarse taxonomy fallback + hierarchical Domain→Framework→Topic beam.
// See classification_using_confidence + hierarchical_classification cookbooks.

export type FineCategory =
  | "Capital"
  | "Liquidity"
  | "AML-BSA"
  | "Consumer Compliance"
  | "Operational Risk"
  | "Other";

export type CoarseCategory =
  | "Prudential"
  | "Financial Crime"
  | "Conduct"
  | "Operations"
  | "General";

export const FINE_TO_COARSE: Record<FineCategory, CoarseCategory> = {
  Capital: "Prudential",
  Liquidity: "Prudential",
  "AML-BSA": "Financial Crime",
  "Consumer Compliance": "Conduct",
  "Operational Risk": "Operations",
  Other: "General",
};

export const COARSE_CRITERIA: Record<CoarseCategory, string> = {
  Prudential:
    "Capital adequacy, liquidity, stress testing, resolution planning, prudential ratios",
  "Financial Crime":
    "AML, BSA, SAR, KYC, OFAC sanctions, fraud and financial crime compliance",
  Conduct:
    "Consumer protection, UDAAP, fair lending, disclosures, market conduct",
  Operations:
    "Operational risk, cyber, vendor/third-party, BCP, model risk, technology",
  General: "Does not fit the coarse buckets above",
};

export type TaxonomyLevel = "fine" | "coarse";

export type TaxonomyResult = {
  fine: FineCategory;
  fineConfidence: number;
  coarse: CoarseCategory;
  level: TaxonomyLevel;
  label: FineCategory | CoarseCategory;
};

/** Prefer fine when confidence ≥ cutoff; otherwise report coarse parent. */
export function applyCoarseFallback(
  fine: FineCategory,
  fineConfidence: number,
  cutoff: number
): TaxonomyResult {
  const coarse = FINE_TO_COARSE[fine] ?? "General";
  const sure = fineConfidence >= cutoff;
  return {
    fine,
    fineConfidence,
    coarse,
    level: sure ? "fine" : "coarse",
    label: sure ? fine : coarse,
  };
}

/** Domain → Framework → Topic hierarchy for beam classification. */
export const HIERARCHY = {
  Prudential: {
    CCAR: ["Capital plan", "Stress CET1", "Distribution limits", "Model inventory"],
    "Dodd-Frank": [
      "Living will / 165(d)",
      "PCS continuity",
      "CMG triggers",
      "Remediation letter",
    ],
    COREP: ["Own funds", "RWA / IRB", "Leverage", "NCA resubmit"],
    Liquidity: ["LCR", "NSFR", "Contingency funding", "ALCO brief"],
  },
  "Financial Crime": {
    "BSA/AML": ["SAR filing", "Monitoring remediation", "Lookback", "Committee brief"],
    OFAC: ["Sanctions screening", "Blocked property", "License review"],
  },
  Conduct: {
    "Call Report": ["RC-R risk weights", "RI provision", "RC-C past-due", "CDR amend"],
    FINREP: ["Stage 2 SICR", "Forbearance", "ECL coverage", "Board Risk brief"],
    Consumer: ["UDAAP", "Fair lending", "Disclosures", "Complaint trend"],
  },
  Operations: {
    Cyber: ["Incident response", "Vendor risk", "Access control"],
    "Model Risk": ["Validation", "Inventory update", "Override policy"],
  },
} as const;

export type HierarchyDomain = keyof typeof HIERARCHY;

export type BeamPath = {
  domain: string;
  framework: string;
  topic: string;
  score: number;
  path: string[];
};

export type BeamClassifyResult = {
  paths: BeamPath[];
  primary: BeamPath | null;
  model?: string;
  latencyMs?: number;
};

export function domainCriteria(): Record<string, string> {
  return {
    Prudential: COARSE_CRITERIA.Prudential,
    "Financial Crime": COARSE_CRITERIA["Financial Crime"],
    Conduct: COARSE_CRITERIA.Conduct,
    Operations: COARSE_CRITERIA.Operations,
  };
}

export function frameworksForDomain(domain: string): Record<string, string> {
  const tree = HIERARCHY[domain as HierarchyDomain];
  if (!tree) return { Other: "Does not fit listed frameworks" };
  const out: Record<string, string> = {};
  for (const fw of Object.keys(tree)) {
    out[fw] = `${fw} supervisory / reporting framework under ${domain}`;
  }
  out.Other = "Does not fit listed frameworks for this domain";
  return out;
}

export function topicsForFramework(
  domain: string,
  framework: string
): Record<string, string> {
  const tree = HIERARCHY[domain as HierarchyDomain];
  const topics =
    tree && framework in tree
      ? (tree as Record<string, readonly string[]>)[framework]
      : null;
  if (!topics) return { Other: "General topic under this framework" };
  const out: Record<string, string> = {};
  for (const t of topics) {
    out[t] = t;
  }
  out.Other = "Other topic under this framework";
  return out;
}
