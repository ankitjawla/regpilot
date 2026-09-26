// Operator-editable agent policy + workflow catalog.
// Thresholds here drive guardrail / router / grounding / gate at runtime.

export type AgentId =
  | "guardrail"
  | "triage"
  | "router"
  | "draft"
  | "grounding"
  | "confidence"
  | "gate";

export type AgentConfig = {
  version: number;
  updatedAt: string | null;
  guardrail: {
    enabled: boolean;
    label: string;
    description: string;
    injectionBlockThreshold: number;
  };
  triage: {
    enabled: boolean;
    label: string;
    description: string;
    escalateFullPathThreshold: number;
    fastPathMinConfidence: number;
    escalateConfidenceCeiling: number;
  };
  router: {
    enabled: boolean;
    label: string;
    description: string;
    routineCategories: string[];
  };
  draft: {
    enabled: boolean;
    label: string;
    description: string;
  };
  grounding: {
    enabled: boolean;
    label: string;
    description: string;
    supportThreshold: number;
    inventedThreshold: number;
  };
  confidence: {
    enabled: boolean;
    label: string;
    description: string;
  };
  gate: {
    enabled: boolean;
    label: string;
    description: string;
    autoApproveAbove: number;
    humanConfirmAbove: number;
  };
};

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  version: 1,
  updatedAt: null,
  guardrail: {
    enabled: true,
    label: "Guardrail agent",
    description:
      "Regex PII redaction first, then TypeSafe injection noul. Blocked inputs never reach Azure.",
    injectionBlockThreshold: 0.55,
  },
  triage: {
    enabled: true,
    label: "Triage agent (System One)",
    description:
      "TypeSafe Choice + Noul judgments for category, urgency, jurisdiction, and escalate.",
    escalateFullPathThreshold: 0.75,
    fastPathMinConfidence: 0.8,
    escalateConfidenceCeiling: 0.85,
  },
  router: {
    enabled: true,
    label: "Router",
    description:
      "Rules over triage + escalate noul. Critical / escalate → full Azure; high-conf routine → fast path.",
    routineCategories: ["Consumer Compliance", "Other", "Operational Risk"],
  },
  draft: {
    enabled: true,
    label: "Draft agent (Azure)",
    description:
      "Azure OpenAI extracts obligations (JSON) and drafts the regulatory memo. System One does not generate prose.",
  },
  grounding: {
    enabled: true,
    label: "Grounding agent (System One)",
    description:
      "TypeSafe Nouls check each obligation and the memo against the redacted source. Soft-fails cap confidence.",
    supportThreshold: 0.55,
    inventedThreshold: 0.55,
  },
  confidence: {
    enabled: true,
    label: "Confidence agent (System One)",
    description:
      "Composite of grounded / complete / actionable nouls plus an overall quality score.",
  },
  gate: {
    enabled: true,
    label: "Confidence gate",
    description:
      "Deterministic thresholds: auto-approve, human confirm, or needs-work before export.",
    autoApproveAbove: 0.9,
    humanConfirmAbove: 0.5,
  },
};

export type WorkflowStep = {
  id: AgentId | "intake" | "human" | "export";
  title: string;
  role: string;
  implementation: string;
  apis: string[];
  runtime: "typesafe" | "azure" | "rules" | "human" | "ui";
  agentKey?: keyof Omit<AgentConfig, "version" | "updatedAt">;
};

/** Catalog used by the Workflow page — mirrors real code paths. */
export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "intake",
    title: "Intake",
    role: "Operator pastes / uploads / loads a fictional sample.",
    implementation: "app/intake/page.tsx · POST /api/triage | /api/pipeline",
    apis: ["POST /api/triage", "POST /api/pipeline"],
    runtime: "ui",
  },
  {
    id: "guardrail",
    title: "Guardrail",
    role: "PII redaction + injection screen before any drafting model runs.",
    implementation: "lib/redact.ts · lib/jev.ts#jevGuardrail · lib/typesafe.ts#typesafeTriage",
    apis: ["POST /api/triage", "POST /api/pipeline"],
    runtime: "typesafe",
    agentKey: "guardrail",
  },
  {
    id: "triage",
    title: "Triage",
    role: "Typed category / urgency / jurisdiction + escalate noul.",
    implementation: "lib/jev.ts#jevClassify · lib/typesafe.ts#typesafeTriage",
    apis: ["POST /api/triage", "POST /api/pipeline"],
    runtime: "typesafe",
    agentKey: "triage",
  },
  {
    id: "router",
    title: "Router",
    role: "Fast path (small Azure) vs full analysis (gpt-5.4).",
    implementation: "lib/jev.ts#routeDecision",
    apis: ["POST /api/triage", "POST /api/pipeline"],
    runtime: "rules",
    agentKey: "router",
  },
  {
    id: "draft",
    title: "Draft",
    role: "Obligation extraction + memo generation on Azure OpenAI.",
    implementation: "lib/jev.ts#extractObligations · lib/jev.ts#draftMemo · lib/azure.ts",
    apis: ["POST /api/analyze", "POST /api/pipeline"],
    runtime: "azure",
    agentKey: "draft",
  },
  {
    id: "grounding",
    title: "Grounding",
    role: "Citation-style check of obligations and memo vs source.",
    implementation: "lib/typesafe.ts#typesafeGroundObligations",
    apis: ["POST /api/analyze", "POST /api/pipeline"],
    runtime: "typesafe",
    agentKey: "grounding",
  },
  {
    id: "confidence",
    title: "Confidence",
    role: "System One quality score with reasons; may be soft-capped by grounding.",
    implementation: "lib/jev.ts#jevConfidence · lib/typesafe.ts#typesafeConfidence",
    apis: ["POST /api/analyze", "POST /api/pipeline"],
    runtime: "typesafe",
    agentKey: "confidence",
  },
  {
    id: "gate",
    title: "Gate",
    role: "Auto-approve, pending review, or needs-work.",
    implementation: "lib/jev.ts#gateDecision",
    apis: ["POST /api/analyze", "POST /api/pipeline"],
    runtime: "rules",
    agentKey: "gate",
  },
  {
    id: "human",
    title: "Human review",
    role: "Approve, request changes, re-analyze, or bulk-clear the queue.",
    implementation: "app/review/page.tsx · app/items/[id]/page.tsx · POST /api/review",
    apis: ["GET/POST /api/review", "GET /api/detail"],
    runtime: "human",
  },
  {
    id: "export",
    title: "Examiner export",
    role: "Downloadable markdown/JSON package with audit + grounding.",
    implementation: "lib/export.ts · GET /api/export · /items/[id]",
    apis: ["GET /api/export", "GET /api/detail"],
    runtime: "ui",
  },
];

function clamp01(n: number, fallback: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function normalizeAgentConfig(raw: unknown): AgentConfig {
  const base = structuredClone(DEFAULT_AGENT_CONFIG);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<AgentConfig>;

  if (r.guardrail) {
    base.guardrail = {
      ...base.guardrail,
      ...r.guardrail,
      injectionBlockThreshold: clamp01(
        r.guardrail.injectionBlockThreshold ?? base.guardrail.injectionBlockThreshold,
        base.guardrail.injectionBlockThreshold
      ),
      enabled: r.guardrail.enabled !== false,
      label: String(r.guardrail.label || base.guardrail.label).slice(0, 80),
      description: String(r.guardrail.description || base.guardrail.description).slice(
        0,
        500
      ),
    };
  }
  if (r.triage) {
    base.triage = {
      ...base.triage,
      ...r.triage,
      escalateFullPathThreshold: clamp01(
        r.triage.escalateFullPathThreshold ?? base.triage.escalateFullPathThreshold,
        base.triage.escalateFullPathThreshold
      ),
      fastPathMinConfidence: clamp01(
        r.triage.fastPathMinConfidence ?? base.triage.fastPathMinConfidence,
        base.triage.fastPathMinConfidence
      ),
      escalateConfidenceCeiling: clamp01(
        r.triage.escalateConfidenceCeiling ?? base.triage.escalateConfidenceCeiling,
        base.triage.escalateConfidenceCeiling
      ),
      enabled: r.triage.enabled !== false,
      label: String(r.triage.label || base.triage.label).slice(0, 80),
      description: String(r.triage.description || base.triage.description).slice(0, 500),
    };
  }
  if (r.router) {
    const cats = Array.isArray(r.router.routineCategories)
      ? r.router.routineCategories.map(String).slice(0, 12)
      : base.router.routineCategories;
    base.router = {
      ...base.router,
      ...r.router,
      routineCategories: cats.length ? cats : base.router.routineCategories,
      enabled: r.router.enabled !== false,
      label: String(r.router.label || base.router.label).slice(0, 80),
      description: String(r.router.description || base.router.description).slice(0, 500),
    };
  }
  if (r.draft) {
    base.draft = {
      ...base.draft,
      enabled: r.draft.enabled !== false,
      label: String(r.draft.label || base.draft.label).slice(0, 80),
      description: String(r.draft.description || base.draft.description).slice(0, 500),
    };
  }
  if (r.grounding) {
    base.grounding = {
      ...base.grounding,
      ...r.grounding,
      supportThreshold: clamp01(
        r.grounding.supportThreshold ?? base.grounding.supportThreshold,
        base.grounding.supportThreshold
      ),
      inventedThreshold: clamp01(
        r.grounding.inventedThreshold ?? base.grounding.inventedThreshold,
        base.grounding.inventedThreshold
      ),
      enabled: r.grounding.enabled !== false,
      label: String(r.grounding.label || base.grounding.label).slice(0, 80),
      description: String(
        r.grounding.description || base.grounding.description
      ).slice(0, 500),
    };
  }
  if (r.confidence) {
    base.confidence = {
      ...base.confidence,
      enabled: r.confidence.enabled !== false,
      label: String(r.confidence.label || base.confidence.label).slice(0, 80),
      description: String(
        r.confidence.description || base.confidence.description
      ).slice(0, 500),
    };
  }
  if (r.gate) {
    base.gate = {
      ...base.gate,
      ...r.gate,
      autoApproveAbove: clamp01(
        r.gate.autoApproveAbove ?? base.gate.autoApproveAbove,
        base.gate.autoApproveAbove
      ),
      humanConfirmAbove: clamp01(
        r.gate.humanConfirmAbove ?? base.gate.humanConfirmAbove,
        base.gate.humanConfirmAbove
      ),
      enabled: r.gate.enabled !== false,
      label: String(r.gate.label || base.gate.label).slice(0, 80),
      description: String(r.gate.description || base.gate.description).slice(0, 500),
    };
  }

  base.version = typeof r.version === "number" ? r.version : base.version;
  base.updatedAt = typeof r.updatedAt === "string" ? r.updatedAt : base.updatedAt;
  return base;
}
