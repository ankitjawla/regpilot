import type { AgentConfig, WorkflowStepId } from "@/lib/agents";

export type WorkflowBranch = {
  /** Edge label on the canvas when present */
  when: string;
  /** Plain condition */
  condition: string;
  /** Next node title */
  goesTo: string;
};

export type WorkflowContract = {
  why: string;
  inputs: string[];
  outputs: string[];
  /** How this step decides what happens next */
  nextHow: string;
  branches: WorkflowBranch[];
};

function thr(config: AgentConfig | null, path: () => string, fallback: string) {
  if (!config) return fallback;
  try {
    return path();
  } catch {
    return fallback;
  }
}

/** Per-step contracts: what goes in, what goes out, how the next block is picked. */
export function contractFor(
  id: WorkflowStepId,
  config: AgentConfig | null = null
): WorkflowContract {
  const inject = thr(
    config,
    () => config!.guardrail.injectionBlockThreshold.toFixed(2),
    "0.55"
  );
  const escalate = thr(
    config,
    () => config!.triage.escalateFullPathThreshold.toFixed(2),
    "0.75"
  );
  const fastConf = thr(
    config,
    () => config!.triage.fastPathMinConfidence.toFixed(2),
    "0.80"
  );
  const auto = thr(
    config,
    () => config!.gate.autoApproveAbove.toFixed(2),
    "0.90"
  );
  const human = thr(
    config,
    () => config!.gate.humanConfirmAbove.toFixed(2),
    "0.50"
  );
  const support = thr(
    config,
    () => config!.grounding.supportThreshold.toFixed(2),
    "0.55"
  );
  const sdeFire = thr(
    config,
    () => config!.draft.sdeFireThreshold.toFixed(2),
    "0.70"
  );
  const covered = thr(
    config,
    () => config!.playbook.coveredThreshold.toFixed(2),
    "0.55"
  );
  const hazardNoul = thr(
    config,
    () => config!.hazard.hazardNoulBlock.toFixed(2),
    "0.70"
  );

  switch (id) {
    case "intake":
      return {
        why: "Get examiner text into the system in a controlled way (paste, upload, or sample).",
        inputs: [
          "Raw regulatory text (or built-in / custom sample)",
          "Operator choice: Triage only vs full Pipeline",
        ],
        outputs: [
          "HTTP body `{ text }` to `/api/triage` or `/api/pipeline`",
          "UI busy state until the API returns",
        ],
        nextHow:
          "Always continues to Guardrail inside the API. There is no skip — every run starts with safety.",
        branches: [
          {
            when: "next",
            condition: "Request accepted",
            goesTo: "Guardrail",
          },
        ],
      };
    case "guardrail":
      return {
        why: "Protect privacy and stop jailbreaks before any drafting model sees the text.",
        inputs: [
          "Raw intake text",
          `Policy: block if injection noul ≥ ${inject}`,
        ],
        outputs: [
          "Redacted text (SSN/phone/email/name tokens)",
          "Injection noul (0–1) + regex screen hit?",
          "block: true|false + reason string",
          "Audit: `guardrail.pass` or `guardrail.block`",
        ],
        nextHow: `Jev answers “is this prompt injection?” If noul ≥ ${inject} (or regex hits), the run stops. Otherwise redacted text is handed to Triage.`,
        branches: [
          {
            when: "block",
            condition: `injection noul ≥ ${inject} OR regex injection hit`,
            goesTo: "Blocked",
          },
          {
            when: "pass",
            condition: `injection noul < ${inject} and no regex hit`,
            goesTo: "Triage",
          },
        ],
      };
    case "blocked":
      return {
        why: "Dead-end for unsafe or injection-suspected input — Azure never runs.",
        inputs: ["Guardrail block decision + reason", "Partial item row (status blocked)"],
        outputs: [
          "Item persisted with blocked status",
          "Audit trail only — no obligations, memo, or export package",
        ],
        nextHow: "No automatic next step. Operator must fix the input and start a new intake.",
        branches: [
          {
            when: "stop",
            condition: "Always terminal",
            goesTo: "(end)",
          },
        ],
      };
    case "triage":
      return {
        why: "Understand what kind of notice this is and how hot it is, using typed Jev judgments.",
        inputs: [
          "Redacted text from Guardrail",
          "Cached TypeSafe batch from the guardrail call when available",
        ],
        outputs: [
          "Choices: category, urgency, jurisdiction (+ confidence)",
          "Escalate noul + uncertain bands",
          "Optional coarse taxonomy + beam path (domain → framework → topic)",
          "Item row fields used by Router",
        ],
        nextHow:
          "Always continues to Router. Triage does not branch — it only produces the numbers Router will read.",
        branches: [
          {
            when: "next",
            condition: "Judgments recorded",
            goesTo: "Router",
          },
        ],
      };
    case "router":
      return {
        why: "Spend Azure wisely: cheap path for routine/high-confidence items, full model when escalate is high.",
        inputs: [
          "Category + confidence from Triage",
          "Escalate noul",
          `Thresholds: escalate ≥ ${escalate}, fast-path confidence ≥ ${fastConf}`,
          "Routine category list from agent policy",
        ],
        outputs: [
          "`fastPath: true|false`",
          "Chosen Azure model / skip reason string",
          "Route reason stored on the item",
        ],
        nextHow: `Rules (not Jev): if escalate noul ≥ ${escalate} or category is non-routine / low confidence → Full Draft. If routine and confidence ≥ ${fastConf} → Fast path.`,
        branches: [
          {
            when: "full",
            condition: `escalate ≥ ${escalate} OR non-routine OR confidence < ${fastConf}`,
            goesTo: "Draft",
          },
          {
            when: "fast",
            condition: `routine category AND confidence ≥ ${fastConf} AND escalate < ${escalate}`,
            goesTo: "Fast path",
          },
        ],
      };
    case "fastpath":
      return {
        why: "Skip heavy Azure drafting when triage already looks routine and confident.",
        inputs: ["Route decision (fastPath)", "Triage judgments already on the item"],
        outputs: [
          "No new obligation/memo from the large model (or only a light pass)",
          "Still proceeds to Confidence with whatever draft exists",
        ],
        nextHow:
          "Joins the same merge point as the verify cluster — Confidence — so the gate still runs.",
        branches: [
          {
            when: "skip draft",
            condition: "Router chose fast path",
            goesTo: "Confidence",
          },
        ],
      };
    case "draft":
      return {
        why: "Turn redacted source into examiner-facing obligations and a memo (Azure prose).",
        inputs: [
          "Redacted source text",
          "Triage labels (for prompts / context)",
          "Draft agent system prompts from Settings",
          `Optional SDE cascade fire threshold ${sdeFire}`,
        ],
        outputs: [
          "Obligation list (owner, action, due_date, quotes)",
          "Optional due_date_iso + date_confidence from Jev",
          "Memo markdown",
          "Cascade rung: small | big (+ verify nouls)",
        ],
        nextHow:
          "On the full pipeline, Draft fans out in parallel to Dedupe, Grounding, Playbook, and Hazard — they do not wait on each other. All merge at Confidence.",
        branches: [
          {
            when: "fan-out",
            condition: "Draft finished (cascade settled)",
            goesTo: "Dedupe · Grounding · Playbook · Hazard (parallel)",
          },
        ],
      };
    case "dedupe":
      return {
        why: "Long letters often repeat the same ask — merge before humans waste review time.",
        inputs: ["Obligation list from Draft"],
        outputs: [
          "Pairwise alignment Score (same / related / different)",
          "Field nouls: same owner / action / due",
          "mergeSuggestions for Review UI",
        ],
        nextHow:
          "Always continues to Confidence (parallel with other verify steps). Does not block siblings.",
        branches: [
          {
            when: "merge",
            condition: "Verify batch complete",
            goesTo: "Confidence",
          },
        ],
      };
    case "grounding":
      return {
        why: "Stop unsupported or invented claims from looking exam-ready.",
        inputs: [
          "Redacted source",
          "Obligations + memo claims",
          `Soft-fail if overall support < ${support}`,
        ],
        outputs: [
          "Per-obligation citation verdict (supports / contradicts / says_nothing / fabricated)",
          "overallSupported + inventedClaims nouls",
          "softFail / needsReview flags",
        ],
        nextHow: `Results are attached to provenance. Soft-fail caps confidence later; low citation confidence can force human confirm. Then merge → Confidence.`,
        branches: [
          {
            when: "merge",
            condition: "Citation pass finished",
            goesTo: "Confidence",
          },
        ],
      };
    case "playbook":
      return {
        why: "Attach framework checklist evidence (CCAR, BSA/AML, …), not just a static label.",
        inputs: [
          "Redacted source + detected/attached playbook",
          `Step covered if noul ≥ ${covered}`,
        ],
        outputs: [
          "Coverage vector per checklist step (P(evidenced))",
          "Gap list → memo open questions",
        ],
        nextHow: "Parallel verify sibling — merges into Confidence with the others.",
        branches: [
          {
            when: "merge",
            condition: "Coverage batch finished",
            goesTo: "Confidence",
          },
        ],
      };
    case "hazard":
      return {
        why: "Catch outbound risk in the *drafted* memo (overclaim, residual PII, speculative advice).",
        inputs: [
          "Memo text from Draft",
          `Block if hazard noul ≥ ${hazardNoul} or severity above policy`,
        ],
        outputs: [
          "Hazard nouls + harm severity Score",
          "disposition: pass | review | block",
        ],
        nextHow:
          "Disposition feeds the Gate (can force review/block). Then merge → Confidence.",
        branches: [
          {
            when: "merge",
            condition: "Hazard screen finished",
            goesTo: "Confidence",
          },
        ],
      };
    case "confidence":
      return {
        why: "One auditable package score from several Jev signals (weights editable).",
        inputs: [
          "Grounded / complete / actionable nouls",
          "Overall quality Score",
          "Soft-caps from grounding / dates / hazard / playbook gaps",
          "Confidence weight sliders from Agents",
        ],
        outputs: [
          "Composite score 0–1 + reason bullets",
          "Raw nouls stored for later recompute without re-calling Jev",
        ],
        nextHow: "Always continues to Gate with the score and flags.",
        branches: [
          {
            when: "next",
            condition: "Score computed",
            goesTo: "Gate",
          },
        ],
      };
    case "gate":
      return {
        why: "Turn numbers into an operational status humans can act on.",
        inputs: [
          `Package score`,
          `Bands: auto ≥ ${auto}, human ≥ ${human}, else needs_work`,
          "Flags: anyUncertain, citation/due-date/hazard review",
        ],
        outputs: [
          "status: auto_approved | pending_review | needs_work",
          "Human-readable gate label",
        ],
        nextHow: `If score ≥ ${auto} and no force-confirm flags → can auto-approve. If score ≥ ${human} (or uncertain/hazard/dates) → Human review. Below → needs_work (still reviewable). Eval is an optional side spur.`,
        branches: [
          {
            when: "review",
            condition: `score < ${auto} OR uncertain/hazard/due-date force confirm`,
            goesTo: "Human review",
          },
          {
            when: "approve",
            condition: `score ≥ ${auto} and no blocking flags`,
            goesTo: "Human review / Export (auto path still visible in Review)",
          },
          {
            when: "calibrate",
            condition: "Operator runs eval (not part of a live item)",
            goesTo: "Calibration / eval",
          },
        ],
      };
    case "human":
      return {
        why: "Examiners own the final call when Jev is uncertain or the package is mid-score.",
        inputs: [
          "Item in pending_review / needs_work",
          "Full detail package (memo, obligations, provenance, grounding)",
        ],
        outputs: [
          "Approve / request changes / bulk actions",
          "Optional obligation merges from dedupe suggestions",
          "Re-analyze trigger",
        ],
        nextHow:
          "Approve → Export-ready package. Re-analyze → loops back to Draft (same item, fresh Azure + Jev verify). Changes keep it in review.",
        branches: [
          {
            when: "approve",
            condition: "Operator approves",
            goesTo: "Examiner export",
          },
          {
            when: "re-analyze",
            condition: "Operator requests re-analyze",
            goesTo: "Draft",
          },
        ],
      };
    case "export":
      return {
        why: "Ship an examiner package that includes drafts *and* the Jev judgments that justified them.",
        inputs: [
          "Approved / reviewable item id",
          "Memo, obligations, grounding, provenance, audit, playbook",
        ],
        outputs: [
          "Markdown examiner package",
          "JSON package (same contents, machine-readable)",
        ],
        nextHow: "Terminal for a single item. New work starts again at Intake.",
        branches: [
          {
            when: "done",
            condition: "Download / view complete",
            goesTo: "(end) or new Intake",
          },
        ],
      };
    case "eval":
      return {
        why: "Tune thresholds with evidence — without writing production decisions.",
        inputs: [
          "Built-in / custom samples",
          "Current agent policy (bands, cutoffs)",
        ],
        outputs: [
          "precision@band, uncertain rate, suggested threshold notes",
          "Eval run records in Neon (no item status changes)",
        ],
        nextHow:
          "Side spur from Gate/Settings. Does not advance a live item. Operator may then edit Agents and re-run production intake.",
        branches: [
          {
            when: "spur",
            condition: "Operator starts calibration",
            goesTo: "(reports only) → back to Agents / Intake",
          },
        ],
      };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
