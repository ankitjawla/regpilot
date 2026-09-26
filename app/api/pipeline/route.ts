import { NextRequest, NextResponse } from "next/server";
import {
  jevGuardrail,
  jevClassify,
  routeDecision,
  extractObligations,
  draftMemo,
  jevConfidence,
  gateDecision,
} from "@/lib/jev";
import { typesafeConfigured, typesafeGroundObligations } from "@/lib/typesafe";
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
  groundingJudgmentsFromResult,
  confidenceJudgmentsFromScore,
  type ItemJudgments,
} from "@/lib/provenance";

export const maxDuration = 120;

/**
 * One-shot intake: guardrail → triage → route → obligations → memo →
 * confidence → grounding → gate. Useful for demos and operator speed.
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

    stage = "guardrail";
    const { guardrail, redacted, jev } = await jevGuardrail(text, origin);
    if (guardrail.block) {
      const blockedJudgments: ItemJudgments | null = jev.typesafe
        ? { triage: triageJudgmentsFromTypesafe(jev.typesafe) }
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
      judgments.triage = triageJudgmentsFromTypesafe(jev.typesafe);
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
      JSON.stringify(triage)
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
    const obligations = agentCfg.draft.enabled
      ? await extractObligations(redacted, triage, {
          systemPrompt: agentCfg.draft.obligationSystemPrompt,
        })
      : [];
    await audit(
      itemId,
      bigDeployment(),
      "obligations.extract",
      `${obligations.length} obligation(s) extracted`
    );

    stage = "memo";
    const { memo, modelUsed } = agentCfg.draft.enabled
      ? await draftMemo(redacted, triage, obligations, route.fastPath, {
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
    const confidence = await jevConfidence(memo, obligations, triage, origin);

    let grounding = null;
    if (
      agentCfg.grounding.enabled &&
      typesafeConfigured() &&
      obligations.length > 0
    ) {
      stage = "grounding";
      try {
        const g = await typesafeGroundObligations({
          source: redacted,
          obligations,
          memo,
        });
        const softFail =
          g.overallSupported < agentCfg.grounding.supportThreshold ||
          g.inventedClaims > agentCfg.grounding.inventedThreshold;
        judgments.grounding = groundingJudgmentsFromResult(g, softFail);
        grounding = {
          model: g.model,
          overallSupported: g.overallSupported,
          inventedClaims: g.inventedClaims,
          unsupportedCount: g.unsupportedCount,
          obligations: g.obligations,
          softFail,
          latencyMs: g.latencyMs,
        };
        await audit(
          itemId,
          g.model,
          "grounding.check",
          JSON.stringify({
            model: g.model,
            overallSupported: g.overallSupported,
            inventedClaims: g.inventedClaims,
            unsupportedCount: g.unsupportedCount,
            softFail,
            details: `${g.unsupportedCount} unsupported obligation(s); inventedClaims noul ${g.inventedClaims.toFixed(2)}`,
          })
        );
        if (softFail) {
          confidence.score = Math.min(confidence.score, 0.49);
          confidence.reasons.push(
            `Grounding soft-fail (supported ${g.overallSupported.toFixed(2)}, invented ${g.inventedClaims.toFixed(2)})`
          );
        } else if (g.unsupportedCount > 0) {
          confidence.score = Math.min(confidence.score, 0.75);
          confidence.reasons.push(
            `${g.unsupportedCount} obligation(s) weakly supported`
          );
        }
      } catch (e) {
        console.error(
          "[pipeline] grounding unavailable:",
          (e as Error).message?.slice(0, 120)
        );
      }
    }

    judgments.confidence = confidenceJudgmentsFromScore({
      ...confidence,
      model: confidence.model,
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
    });
    await audit(itemId, "gate", `gate.${gate.status}`, gate.label);

    stage = "persist_results";
    for (const o of obligations) {
      await query(
        `INSERT INTO regpilot_obligations(item_id, owner, action, due_date, source_quote)
         VALUES ($1,$2,$3,$4,$5)`,
        [itemId, o.owner, o.action, o.due_date, o.source_quote]
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
      })
    );

    return NextResponse.json({
      blocked: false,
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
      },
      route: { fastPath: route.fastPath, model: route.model, reason: route.reason },
      jev: { model: triage.jev.model, latencyMs: triage.jev.latencyMs },
      obligations,
      memo,
      modelUsed,
      confidence,
      grounding,
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
