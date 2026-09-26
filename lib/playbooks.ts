// Framework playbooks — operator checklists attached to examiner packages.

export type Playbook = {
  id: string;
  framework: string;
  title: string;
  steps: string[];
};

export const FRAMEWORK_PLAYBOOKS: Playbook[] = [
  {
    id: "ccar",
    framework: "CCAR",
    title: "CCAR capital plan checklist",
    steps: [
      "Confirm severely adverse scenario assumptions match FRB package",
      "Verify Board attestation / internal audit review recorded",
      "Check planned distributions vs stress CET1 path",
      "Update model-risk inventory for PPNR and credit-loss models",
      "File capital plan by supervisory deadline",
    ],
  },
  {
    id: "dodd-frank",
    framework: "Dodd-Frank",
    title: "Dodd-Frank §165(d) resolution checklist",
    steps: [
      "Map critical shared services and vendor resolution clauses",
      "Demonstrate PCS continuity (Fedwire/CHIPS/ACH) under preferred strategy",
      "Refresh CMG escalation triggers (LCR/NSFR)",
      "Submit remediation progress letter within agency timeline",
    ],
  },
  {
    id: "corep",
    framework: "COREP",
    title: "COREP own-funds checklist",
    steps: [
      "Reconcile CET1 and foreseeable dividend deductions (CRR Art. 26)",
      "Validate RWA scaling / IRB slots in C 08 templates",
      "Check leverage exposure measure for double-counts",
      "Resubmit corrected templates via NCA portal",
    ],
  },
  {
    id: "finrep",
    framework: "FINREP",
    title: "FINREP credit-quality checklist",
    steps: [
      "Reconcile Stage 2 SICR flags to IFRS 9 policy",
      "Test forbearance cure / probation exits in F 19.00",
      "Attest FINREP data quality before next submission",
      "Brief Board Risk on ECL coverage vs Stage migration",
    ],
  },
  {
    id: "call-report",
    framework: "Call Report",
    title: "Call Report (FFIEC 031) checklist",
    steps: [
      "Recalculate RC-R risk weights (incl. HVCRE)",
      "Reconcile RI provision to ALCO-approved overlays",
      "Validate RC-C past-due / PCD reporting",
      "Amend via CDR and notify portfolio manager if ratios change",
    ],
  },
  {
    id: "bsa-aml",
    framework: "BSA/AML",
    title: "BSA/AML / SAR checklist",
    steps: [
      "Confirm SAR filing clock from detection date",
      "Remediate monitoring / case-management root cause",
      "Document lookback scope and independent validation",
      "Brief Compliance Committee until MRA cleared",
    ],
  },
];

export function playbookForText(opts: {
  title?: string | null;
  category?: string | null;
  source?: string | null;
}): Playbook | null {
  const blob = `${opts.title || ""} ${opts.category || ""} ${opts.source || ""}`.toLowerCase();
  const order = [
    ["ccar", "ccar"],
    ["dodd-frank", "dodd-frank"],
    ["dodd frank", "dodd-frank"],
    ["165(d)", "dodd-frank"],
    ["living will", "dodd-frank"],
    ["corep", "corep"],
    ["finrep", "finrep"],
    ["ifrs 9", "finrep"],
    ["call report", "call-report"],
    ["ffiec", "call-report"],
    ["sar", "bsa-aml"],
    ["bsa", "bsa-aml"],
    ["aml", "bsa-aml"],
  ] as const;
  for (const [needle, id] of order) {
    if (blob.includes(needle)) {
      return FRAMEWORK_PLAYBOOKS.find((p) => p.id === id) || null;
    }
  }
  if (opts.category === "Capital" || opts.category === "Liquidity") {
    return FRAMEWORK_PLAYBOOKS.find((p) => p.id === "ccar") || null;
  }
  if (opts.category === "AML-BSA") {
    return FRAMEWORK_PLAYBOOKS.find((p) => p.id === "bsa-aml") || null;
  }
  return null;
}
