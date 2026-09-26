import {
  DEFAULT_AGENT_CONFIG,
  type AgentConfig,
  type PolicyPresetId,
} from "@/lib/agents";

export type { PolicyPresetId };

export const POLICY_PRESETS: Record<
  Exclude<PolicyPresetId, "custom">,
  { label: string; description: string; patch: Partial<AgentConfig> }
> = {
  balanced: {
    label: "Balanced",
    description: "Default RegPilot thresholds for demos and day-to-day triage.",
    patch: structuredClone(DEFAULT_AGENT_CONFIG),
  },
  strict: {
    label: "Strict exam",
    description:
      "Lower auto-approve, aggressive escalate/grounding — more human review.",
    patch: {
      guardrail: {
        ...DEFAULT_AGENT_CONFIG.guardrail,
        injectionBlockThreshold: 0.45,
      },
      triage: {
        ...DEFAULT_AGENT_CONFIG.triage,
        escalateFullPathThreshold: 0.6,
        fastPathMinConfidence: 0.9,
        escalateConfidenceCeiling: 0.92,
      },
      grounding: {
        ...DEFAULT_AGENT_CONFIG.grounding,
        supportThreshold: 0.7,
        inventedThreshold: 0.4,
      },
      gate: {
        ...DEFAULT_AGENT_CONFIG.gate,
        autoApproveAbove: 0.95,
        humanConfirmAbove: 0.65,
      },
    },
  },
  lenient: {
    label: "Lenient demo",
    description: "Faster auto-approve for demos; still blocks clear injection.",
    patch: {
      guardrail: {
        ...DEFAULT_AGENT_CONFIG.guardrail,
        injectionBlockThreshold: 0.7,
      },
      triage: {
        ...DEFAULT_AGENT_CONFIG.triage,
        escalateFullPathThreshold: 0.85,
        fastPathMinConfidence: 0.7,
        escalateConfidenceCeiling: 0.75,
      },
      grounding: {
        ...DEFAULT_AGENT_CONFIG.grounding,
        supportThreshold: 0.4,
        inventedThreshold: 0.7,
      },
      gate: {
        ...DEFAULT_AGENT_CONFIG.gate,
        autoApproveAbove: 0.8,
        humanConfirmAbove: 0.4,
      },
    },
  },
  exam_ready: {
    label: "Exam package",
    description:
      "Optimized for examiner packages: full path preferred, grounding always on.",
    patch: {
      triage: {
        ...DEFAULT_AGENT_CONFIG.triage,
        escalateFullPathThreshold: 0.55,
        fastPathMinConfidence: 0.95,
        escalateConfidenceCeiling: 0.98,
      },
      router: {
        ...DEFAULT_AGENT_CONFIG.router,
        routineCategories: ["Other"],
      },
      grounding: {
        ...DEFAULT_AGENT_CONFIG.grounding,
        enabled: true,
        supportThreshold: 0.65,
        inventedThreshold: 0.45,
      },
      gate: {
        ...DEFAULT_AGENT_CONFIG.gate,
        autoApproveAbove: 0.97,
        humanConfirmAbove: 0.55,
      },
      console: {
        orgName: "RegPilot Examination Console",
        exportTitlePrefix: "Examiner package",
        exportFooter:
          "Generated for examination support. Verify all citations against source before filing.",
        memoSections:
          "## Subject\n## Background\n## Key obligations\n## Recommended actions\n## Open questions\n## Examiner notes",
      },
    },
  },
};

export function applyPreset(
  current: AgentConfig,
  preset: Exclude<PolicyPresetId, "custom">
): AgentConfig {
  const def = POLICY_PRESETS[preset];
  if (!def) return current;
  const next = structuredClone(current);
  const p = def.patch;
  if (p.guardrail) next.guardrail = { ...next.guardrail, ...p.guardrail };
  if (p.triage) next.triage = { ...next.triage, ...p.triage };
  if (p.router) next.router = { ...next.router, ...p.router };
  if (p.draft) next.draft = { ...next.draft, ...p.draft };
  if (p.grounding) next.grounding = { ...next.grounding, ...p.grounding };
  if (p.confidence) next.confidence = { ...next.confidence, ...p.confidence };
  if (p.gate) next.gate = { ...next.gate, ...p.gate };
  if (p.hazard) next.hazard = { ...next.hazard, ...p.hazard };
  if (p.playbook) next.playbook = { ...next.playbook, ...p.playbook };
  if (p.dedupe) next.dedupe = { ...next.dedupe, ...p.dedupe };
  if (p.console) next.console = { ...next.console, ...p.console };
  next.preset = preset;
  return next;
}
