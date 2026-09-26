import { NextRequest, NextResponse } from "next/server";
import {
  jevGuardrail,
  jevClassify,
  routeDecision,
  extractObligationsCascade,
  draftMemo,
  jevConfidence,
  gateDecision,
} from "@/lib/jev";
import { bigDeployment } from "@/lib/azure";
import { query, audit } from "@/lib/db";
import { rateLimited, clientIp } from "@/lib/ratelimit";
import { getAgentConfig } from "@/lib/agent-store";
import {
  DEFAULT_AGENT_CONFIG,
  resolveMemoSystemPrompt,
} from "@/lib/agents";
import {
  triageJudgmentsFromTypesafe,
  confidenceJudgmentsFromScore,
  type ItemJudgments,
} from "@/lib/provenance";
import {
  bandCfgFromAgent,
  maybeBeamClassify,
  runPostDraftEnhancements,
  applyConfidencePatch,
  enrichTriageJudgments,
  taxonomyFromTriage,
} from "@/lib/enhance";

export const maxDuration = 120;

/**
 * One-shot intake: guardrail → triage → route → obligations (cascade) → memo →
 * enhancements (dates/dedupe/grounding/playbook/hazard) → confidence → gate.
 */
export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  let stage = "init";
  try {
    const { text, title } = (await req.json()) as {
      text?: string;
      title?: string;
    };
    if (typeof text !== "string" || text.trim().length < 20) {
      return NextResponse.json(
        { error: "Please provide at least a few sentences of text." },
        { status: 400 }
      );
    }
    if (text.length > 30000) {
      return NextResponse.json(
        { error: "Text is too long (max 30,000 characters)." },
        { status: 400 }
      );
    }

    const cleanTitle =
      (typeof title === "string" && title.trim().slice(0, 120)) ||
      text.trim().replace(/\s+/g, " ").slice(0, 80);
    const origin = req.nextUrl.origin;
    const agentCfg = await getAgentConfig().catch(() => DEFAULT_AGENT_CONFIG);
    const bands = bandCfgFromAgent(agentCfg);

    stage = "guardrail";
    const { guardrail, redacted, jev } = await jevGuardrail(text, origin);
    if (guardrail.block) {
      const blockedJudgments: ItemJudgments | null = jev.typesafe
        ? {
            triage: triageJudgmentsFromTypesafe(jev.typesafe, {
              bandCfg: bands,
            }),
          }
        : null;
      const rows = await query<{ id: number }>(
        `INSERT INTO regpilot_items
           (title, source_text_redacted, status, policy_version, preset, judgments)
         VALUES ($1,$2,'blocked',$3,$4,$5) RETURNING id`,
        [
          cleanTitle,
          redacted,
          agentCfg.version,
          agentCfg.preset,
          blockedJudgments ? JSON.stringify(blockedJudgments) : null,
        ]
      );
      const itemId = rows[0].id;
      await audit(itemId, jev.model, "guardrail.block", guardrail.reason);
      await audit(
        itemId,
        "policy",
        "policy.stamp",
        JSON.stringify({
          policy_version: agentCfg.version,
          preset: agentCfg.preset,
        })
      );
      return NextResponse.json({
        blocked: true,
        itemId,
        guardrail,
        jev: { model: jev.model, latencyMs: jev.latencyMs },
        provenance: {
          policy_version: agentCfg.version,
          preset: agentCfg.preset,
        },
      });
    }

    stage = "triage";
    const triage = await jevClassify(redacted, origin, jev.full, jev.typesafe);
    const taxonomy = taxonomyFromTriage(
      triage,
      agentCfg.triage.coarseTaxonomyCutoff
    );
    const beam = await maybeBeamClassify(
      redacted,
      agentCfg.triage.beamClassifyEnabled
    );

    // Prefer coarse label for router routine check when configured.
    const routeCategory =
      agentCfg.router.preferCoarseForRouting && taxonomy.level === "coarse"
        ? triage.category
        : triage.category;
    void routeCategory;

    stage = "router";
    const route = routeDecision(triage, {
      escalateNoul: jev.typesafe?.escalate.noul ?? null,
      escalateFullPathThreshold: agentCfg.triage.escalateFullPathThreshold,
      fastPathMinConfidence: agentCfg.triage.fastPathMinConfidence,
      escalateConfidenceCeiling: agentCfg.triage.escalateConfidenceCeiling,
      routineCategories: agentCfg.router.routineCategories,
    });

    const judgments: ItemJudgments = {};
    if (jev.typesafe) {
      judgments.triage = enrichTriageJudgments(
        triageJudgmentsFromTypesafe(jev.typesafe, {
          bandCfg: bands,
          taxonomy,
          beam: beam || undefined,
        }),
        triage,
        agentCfg,
        beam
      );
    }

    stage = "persist";
    const rows = await query<{ id: number }>(
      `INSERT INTO regpilot_items
         (title, source_text_redacted, category, urgency, jurisdiction, confidence, fast_path, status, policy_version, preset, judgments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'triaged',$8,$9,$10) RETURNING id`,
      [
        cleanTitle,
        redacted,
        triage.category,
        triage.urgency,
        triage.jurisdiction,
        triage.confidence,
        route.fastPath,
        agentCfg.version,
        agentCfg.preset,
        Object.keys(judgments).length ? JSON.stringify(judgments) : null,
      ]
    );
    const itemId = rows[0].id;
    await audit(itemId, jev.model, "guardrail.pass", guardrail.reason);
    await audit(
      itemId,
      triage.jev.model,
      "triage.classify",
      JSON.stringify({
        ...triage,
        taxonomy,
        anyUncertain: judgments.triage?.anyUncertain,
      })
    );
    await audit(
      itemId,
      "router",
      route.fastPath ? "route.fast_path" : "route.full_analysis",
      route.reason
    );
    await audit(
      itemId,
      "policy",
      "policy.stamp",
      JSON.stringify({
        policy_version: agentCfg.version,
        preset: agentCfg.preset,
        hasTriageJudgments: Boolean(judgments.triage),
      })
    );

    stage = "obligations";
    const { obligations: rawObs, cascade } = agentCfg.draft.enabled
      ? await extractObligationsCascade(redacted, triage, {
          systemPrompt: agentCfg.draft.obligationSystemPrompt,
          cascadeEnabled: agentCfg.draft.sdeCascadeEnabled,
          fireThreshold: agentCfg.draft.sdeFireThreshold,
        })
      : {
          obligations: [],
          cascade: {
            rung: "skipped" as const,
            verified: false,
          },
        };
    await audit(
      itemId,
      cascade.model || bigDeployment(),
      "obligations.extract",
      `${rawObs.length} obligation(s) · cascade rung=${cascade.rung}`
    );

    stage = "memo";
    const { memo, modelUsed } = agentCfg.draft.enabled
      ? await draftMemo(redacted, triage, rawObs, route.fastPath, {
          systemPrompt: resolveMemoSystemPrompt(agentCfg),
        })
      : {
          memo: "_Draft agent disabled in Settings / Agents._",
          modelUsed: "disabled",
        };
    await audit(
      itemId,
      modelUsed,
      "memo.draft",
      route.fastPath ? "fast path (small model)" : "full analysis (large model)"
    );

    stage = "confidence";
    let confidence = await jevConfidence(
      memo,
      rawObs,
      triage,
      origin,
      agentCfg.confidence
    );

    stage = "enhance";
    const enhanced = await runPostDraftEnhancements({
      source: redacted,
      title: cleanTitle,
      memo,
      obligations: rawObs,
      triage,
      agentCfg,
      cascade,
      existingJudgments: judgments,
    });
    Object.assign(judgments, enhanced.judgments);
    confidence = applyConfidencePatch(confidence, enhanced.confidencePatch);
    const obligations = enhanced.obligations;
    const grounding = enhanced.grounding;

    if (grounding) {
      await audit(
        itemId,
        grounding.model,
        "grounding.check",
        JSON.stringify({
          model: grounding.model,
          overallSupported: grounding.overallSupported,
          inventedClaims: grounding.inventedClaims,
          unsupportedCount: grounding.unsupportedCount,
          softFail: grounding.softFail,
          verdictCounts: grounding.verdictCounts,
          needsReview: grounding.needsReview,
        })
      );
    }
    if (judgments.hazard) {
      await audit(
        itemId,
        judgments.hazard.model,
        "hazard.screen",
        JSON.stringify(judgments.hazard)
      );
    }
    if (judgments.playbook) {
      await audit(
        itemId,
        judgments.playbook.model,
        "playbook.coverage",
        JSON.stringify({
          playbookId: judgments.playbook.playbookId,
          meanCoverage: judgments.playbook.meanCoverage,
          missing: judgments.playbook.missingSteps,
        })
      );
    }
    if (judgments.dueDates) {
      await audit(
        itemId,
        "typesafe",
        "due_date.extract",
        JSON.stringify({
          count: judgments.dueDates.extractions.length,
          anyNeedsReview: judgments.dueDates.anyNeedsReview,
        })
      );
    }
    if (judgments.dedupe) {
      await audit(
        itemId,
        judgments.dedupe.model,
        "obligations.dedupe",
        JSON.stringify({
          pairs: judgments.dedupe.pairs.length,
          merges: judgments.dedupe.mergeSuggestions.length,
        })
      );
    }
    if (judgments.cascade) {
      await audit(
        itemId,
        judgments.cascade.model || "cascade",
        "cascade.rung",
        JSON.stringify(judgments.cascade)
      );
    }

    judgments.confidence = confidenceJudgmentsFromScore({
      ...confidence,
      model: confidence.model,
      weights: {
        weightGrounded: agentCfg.confidence.weightGrounded,
        weightComplete: agentCfg.confidence.weightComplete,
        weightActionable: agentCfg.confidence.weightActionable,
        weightOverall: agentCfg.confidence.weightOverall,
      },
    });

    await audit(
      itemId,
      confidence.model,
      "confidence.score",
      `score=${confidence.score.toFixed(2)}: ${confidence.reasons.slice(0, 3).join("; ")}`
    );

    stage = "gate";
    const gate = gateDecision(confidence.score, {
      autoApproveAbove: agentCfg.gate.autoApproveAbove,
      humanConfirmAbove: agentCfg.gate.humanConfirmAbove,
      forceConfirmOnUncertain: agentCfg.gate.forceConfirmOnUncertain,
      anyUncertain: enhanced.confidencePatch.anyUncertain,
      dueDateNeedsReview: enhanced.confidencePatch.dueDateNeedsReview,
      dueDateForceConfirm: agentCfg.draft.dueDateForceConfirm,
      hazardDisposition: enhanced.confidencePatch.hazardDisposition,
      groundingNeedsReview: enhanced.confidencePatch.groundingNeedsReview,
    });
    await audit(itemId, "gate", `gate.${gate.status}`, gate.label);

    stage = "persist_results";
    for (const o of obligations) {
      await query(
        `INSERT INTO regpilot_obligations(item_id, owner, action, due_date, source_quote, due_date_iso, date_confidence, needs_review)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          itemId,
          o.owner,
          o.action,
          o.due_date,
          o.source_quote,
          o.due_date_iso ?? null,
          o.date_confidence ?? null,
          o.needs_review ?? false,
        ]
      );
    }
    await query(
      `INSERT INTO regpilot_drafts(item_id, memo_text, model_used) VALUES ($1,$2,$3)`,
      [itemId, memo, modelUsed]
    );
    await query(
      `UPDATE regpilot_items
       SET confidence=$2, status=$3, policy_version=$4, preset=$5, judgments=$6
       WHERE id=$1`,
      [
        itemId,
        confidence.score,
        gate.status,
        agentCfg.version,
        agentCfg.preset,
        JSON.stringify(judgments),
      ]
    );
    await audit(
      itemId,
      "policy",
      "policy.stamp",
      JSON.stringify({
        policy_version: agentCfg.version,
        preset: agentCfg.preset,
        hasGrounding: Boolean(judgments.grounding),
        hasConfidence: Boolean(judgments.confidence),
        hasHazard: Boolean(judgments.hazard),
        hasPlaybook: Boolean(judgments.playbook),
      })
    );

    return NextResponse.json({
      blocked: gate.status === "blocked",
      itemId,
      guardrail: {
        piiFound: guardrail.piiFound,
        redactions: guardrail.redactions,
        injectionSuspected: guardrail.injectionSuspected,
        reason: guardrail.reason,
      },
      triage: {
        category: triage.category,
        urgency: triage.urgency,
        jurisdiction: triage.jurisdiction,
        confidence: triage.confidence,
        rationale: triage.rationale,
        taxonomy,
        anyUncertain: judgments.triage?.anyUncertain,
      },
      route: { fastPath: route.fastPath, model: route.model, reason: route.reason },
      jev: { model: triage.jev.model, latencyMs: triage.jev.latencyMs },
      obligations,
      memo,
      modelUsed,
      confidence,
      grounding,
      cascade,
      gate,
      status: gate.status,
      preset: agentCfg.preset,
      provenance: {
        policy_version: agentCfg.version,
        preset: agentCfg.preset,
        judgments,
      },
    });
  } catch (e) {
    const msg = (e as Error).message || "unknown";
    console.error("[pipeline]", stage, msg);
    const safe = msg
      .replace(/sk-[a-zA-Z0-9]+/g, "[redacted]")
      .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
      .slice(0, 180);
    return NextResponse.json(
      {
        error: `Pipeline failed at ${stage}. ${safe}`,
        stage,
      },
      { status: 500 }
    );
  }
}
