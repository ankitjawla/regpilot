import { NextRequest, NextResponse } from "next/server";
import {
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
  confidenceJudgmentsFromScore,
  mergeJudgments,
  parseJudgments,
  type ItemJudgments,
} from "@/lib/provenance";
import {
  runPostDraftEnhancements,
  applyConfidencePatch,
} from "@/lib/enhance";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  try {
    const { itemId } = (await req.json()) as { itemId?: number };
    if (!itemId || typeof itemId !== "number") {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const items = await query<{
      id: number;
      title: string;
      source_text_redacted: string;
      category: string;
      urgency: string;
      jurisdiction: string;
      confidence: number;
      fast_path: boolean;
      status: string;
      judgments: unknown;
    }>(`SELECT * FROM regpilot_items WHERE id=$1`, [itemId]);
    const item = items[0];
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (item.status === "blocked") {
      return NextResponse.json(
        { error: "Blocked items cannot be analyzed." },
        { status: 400 }
      );
    }

    const triage = {
      category: item.category,
      urgency: item.urgency,
      jurisdiction: item.jurisdiction,
      confidence: item.confidence,
      rationale: "",
    } as Parameters<typeof extractObligationsCascade>[1];

    const agentCfg = await getAgentConfig().catch(() => DEFAULT_AGENT_CONFIG);
    let judgments: ItemJudgments = parseJudgments(item.judgments) || {};

    const { obligations: rawObs, cascade } = agentCfg.draft.enabled
      ? await extractObligationsCascade(item.source_text_redacted, triage, {
          systemPrompt: agentCfg.draft.obligationSystemPrompt,
          cascadeEnabled: agentCfg.draft.sdeCascadeEnabled,
          fireThreshold: agentCfg.draft.sdeFireThreshold,
        })
      : {
          obligations: [],
          cascade: { rung: "skipped" as const, verified: false },
        };
    await audit(
      itemId,
      cascade.model || bigDeployment(),
      "obligations.extract",
      `${rawObs.length} obligation(s) · cascade rung=${cascade.rung}`
    );

    const { memo, modelUsed } = agentCfg.draft.enabled
      ? await draftMemo(
          item.source_text_redacted,
          triage,
          rawObs,
          item.fast_path,
          { systemPrompt: resolveMemoSystemPrompt(agentCfg) }
        )
      : {
          memo: "_Draft agent disabled in Settings / Agents._",
          modelUsed: "disabled",
        };
    await audit(
      itemId,
      modelUsed,
      "memo.draft",
      item.fast_path ? "fast path (small model)" : "full analysis (large model)"
    );

    let confidence = await jevConfidence(
      memo,
      rawObs,
      triage,
      req.nextUrl.origin,
      agentCfg.confidence
    );

    const enhanced = await runPostDraftEnhancements({
      source: item.source_text_redacted,
      title: item.title,
      memo,
      obligations: rawObs,
      triage,
      agentCfg,
      cascade,
      existingJudgments: judgments,
    });
    judgments = mergeJudgments(judgments, enhanced.judgments);
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
    if (judgments.cascade) {
      await audit(
        itemId,
        judgments.cascade.model || "cascade",
        "cascade.rung",
        JSON.stringify(judgments.cascade)
      );
    }

    judgments = mergeJudgments(judgments, {
      confidence: confidenceJudgmentsFromScore({
        ...confidence,
        model: confidence.model,
        weights: {
          weightGrounded: agentCfg.confidence.weightGrounded,
          weightComplete: agentCfg.confidence.weightComplete,
          weightActionable: agentCfg.confidence.weightActionable,
          weightOverall: agentCfg.confidence.weightOverall,
        },
      }),
    });

    await audit(
      itemId,
      confidence.model,
      "confidence.score",
      `score=${confidence.score.toFixed(2)}: ${confidence.reasons.slice(0, 3).join("; ")}`
    );

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

    await query(`DELETE FROM regpilot_obligations WHERE item_id=$1`, [itemId]);
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
    await query(`DELETE FROM regpilot_drafts WHERE item_id=$1`, [itemId]);
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
      })
    );

    return NextResponse.json({
      itemId,
      obligations,
      memo,
      modelUsed,
      confidence,
      grounding,
      cascade,
      gate,
      status: gate.status,
      provenance: {
        policy_version: agentCfg.version,
        preset: agentCfg.preset,
        judgments,
      },
    });
  } catch (e) {
    console.error("[analyze]", (e as Error).message);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
