/** Plain-language copy for how TypeSafe System One (Jev) works in RegPilot. */

export type AgentKeyForPrimer =
  | "guardrail"
  | "triage"
  | "router"
  | "draft"
  | "dedupe"
  | "grounding"
  | "playbook"
  | "hazard"
  | "confidence"
  | "gate";

export const JEV_PRIMER = {
  title: "How Jev (System One) works",
  lead:
    "Jev is TypeSafe’s decision model. It does not write the memo — it answers typed questions so RegPilot can block unsafe input, route work, check citations, and score quality with numbers you can audit.",
  primitives: [
    {
      name: "Noul",
      plain: "Yes / no probability",
      detail:
        "A number from 0 to 1 for a yes/no question (e.g. “Is this prompt injection?”). 0.02 means almost certainly no; 0.90 means almost certainly yes. Your sliders decide what count as block, escalate, or uncertain.",
    },
    {
      name: "Choice",
      plain: "Pick one label",
      detail:
        "Jev picks among fixed options (category, urgency, jurisdiction) and returns a confidence plus probabilities for each option. Low confidence can be treated as uncertain or rolled up to a coarser label.",
    },
    {
      name: "Score",
      plain: "Quality on a scale",
      detail:
        "A graded judgment (e.g. overall memo quality, harm severity). RegPilot blends several nouls and scores with editable weights, then the gate turns that into auto-approve / human review / needs work.",
    },
  ],
  vsAzure:
    "Azure OpenAI drafts obligations and memos (prose). Jev judges and routes (numbers). Both leave an audit trail; examiner packages show the judgments alongside the draft.",
} as const;

export const AGENT_PLAIN: Record<
  AgentKeyForPrimer,
  { summary: string; jevDoes: string; youControl: string }
> = {
  guardrail: {
    summary:
      "First door after intake. Strip personal data, then ask Jev whether the text is trying to jailbreak the system. Blocked text never reaches Azure.",
    jevDoes:
      "Answers: “Is this prompt injection?” → injection noul (0–1). A cheap regex screen can also force a block on obvious phrases.",
    youControl:
      "Injection block threshold — if the noul is at or above this value, the run stops. Lower = stricter (more blocks).",
  },
  triage: {
    summary:
      "Classifies the notice so later steps know what kind of exam letter it is and how urgently to treat it.",
    jevDoes:
      "Choices for category, urgency, and jurisdiction; noul for “should we escalate?”; optional beam path (domain → framework → topic). Mid-range nouls or low-confidence choices become an explicit uncertain band.",
    youControl:
      "Escalate threshold, fast-path confidence, uncertain noul band, choice confidence floor, and whether to use coarse taxonomy / beam classify.",
  },
  router: {
    summary:
      "Rules (not Jev) that choose Azure small vs full analysis from triage results.",
    jevDoes:
      "Uses the escalate noul and category confidence that triage already produced — no new Jev call.",
    youControl:
      "Which categories count as routine, and whether to prefer a coarse label when triage was unsure.",
  },
  draft: {
    summary:
      "Azure writes obligations and the memo. Jev can verify fields and extract due dates more carefully.",
    jevDoes:
      "Optional cascade: after a cheap extract, nouls ask “is this field wrong?” — if yes, re-run on the large Azure model. Separate date Choices assemble an ISO due date with a confidence.",
    youControl:
      "Cascade on/off and fire threshold; due-date extract on/off; how low date confidence must be before human confirm.",
  },
  dedupe: {
    summary:
      "Finds near-duplicate obligations so Review can merge them before export.",
    jevDoes:
      "Scores pairs as same / related / different and checks whether owner, action, and due date match.",
    youControl:
      "Enable or disable. Merge suggestions appear on the Review / item screens.",
  },
  grounding: {
    summary:
      "Checks that drafted claims and obligations are backed by the redacted source — citation-grade, not just a vibe score.",
    jevDoes:
      "Locates the quote in the source, then a Choice: supports / contradicts / says nothing (missing quote → fabricated). Soft-fails cap confidence.",
    youControl:
      "Overall support floor, invented-claims ceiling, and citation auto-accept confidence.",
  },
  playbook: {
    summary:
      "Turns the framework checklist (CCAR, BSA/AML, …) into evidence-linked coverage, not just a static attachment.",
    jevDoes:
      "One batched call: for each checklist step, a noul/score for “does the source evidence this?” Gaps become memo open questions.",
    youControl:
      "Covered threshold — step nouls at/above this count as covered.",
  },
  hazard: {
    summary:
      "Screens the outbound memo before the gate, so overclaiming or residual risk does not ship in an examiner package.",
    jevDoes:
      "Hazard nouls (e.g. speculative advice, PII leak) plus a harm severity Score → pass / review / block.",
    youControl:
      "Severity cutoffs for review vs block, and the hazard noul level that forces a block.",
  },
  confidence: {
    summary:
      "Blends several Jev judgments into one package score used by the gate.",
    jevDoes:
      "Nouls for grounded / complete / actionable plus an overall quality Score. Raw values are stored so you can reweight later without re-running Jev.",
    youControl:
      "Relative weights of those four signals (renormalized at score time).",
  },
  gate: {
    summary:
      "Deterministic last mile: score bands → auto-approve, pending review, or needs work.",
    jevDoes:
      "Does not call Jev. Reads the confidence score and uncertain / citation / due-date / hazard flags from earlier steps.",
    youControl:
      "Auto-approve and human-confirm floors, and whether uncertain bands always force human confirm.",
  },
};
