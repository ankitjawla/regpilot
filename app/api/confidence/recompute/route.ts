import { NextRequest, NextResponse } from "next/server";
import { query, audit } from "@/lib/db";
import { getAgentConfig } from "@/lib/agent-store";
import { DEFAULT_AGENT_CONFIG } from "@/lib/agents";
import { recomputeConfidenceFromJudgments, gateDecision } from "@/lib/jev";
import {
  parseJudgments,
  mergeJudgments,
  confidenceJudgmentsFromScore,
} from "@/lib/provenance";

/** Recompute confidence + gate from stored raw nouls using current weight sliders. */
export async function POST(req: NextRequest) {
  try {
    const { itemId } = (await req.json()) as { itemId?: number };
    if (!itemId) {
      return NextResponse.json({ error: "itemId required" }, { status: 400 });
    }
    const rows = await query<{
      id: number;
      status: string;
      judgments: unknown;
    }>(`SELECT id, status, judgments FROM regpilot_items WHERE id=$1`, [itemId]);
    const item = rows[0];
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const judgments = parseJudgments(item.judgments);
    const raw = judgments?.confidence;
    if (!raw) {
      return NextResponse.json(
        { error: "No stored confidence judgments to recompute" },
        { status: 400 }
      );
    }
    const agentCfg = await getAgentConfig().catch(() => DEFAULT_AGENT_CONFIG);
    const score = recomputeConfidenceFromJudgments(raw, agentCfg.confidence);
    if (score == null) {
      return NextResponse.json(
        { error: "Stored judgments missing raw nouls" },
        { status: 400 }
      );
    }
    const gate = gateDecision(score, {
      autoApproveAbove: agentCfg.gate.autoApproveAbove,
      humanConfirmAbove: agentCfg.gate.humanConfirmAbove,
      forceConfirmOnUncertain: agentCfg.gate.forceConfirmOnUncertain,
      anyUncertain: judgments?.triage?.anyUncertain,
      dueDateNeedsReview: judgments?.dueDates?.anyNeedsReview,
      dueDateForceConfirm: agentCfg.draft.dueDateForceConfirm,
      hazardDisposition: judgments?.hazard?.disposition,
      groundingNeedsReview: judgments?.grounding?.needsReview,
    });

    const nextJudgments = mergeJudgments(judgments, {
      confidence: confidenceJudgmentsFromScore({
        score,
        reasons: [
          ...(raw.reasons || []),
          `Recomputed from stored nouls with current weights → ${score.toFixed(2)}`,
        ].slice(0, 8),
        model: raw.model,
        groundedNoul: raw.groundedNoul,
        completeNoul: raw.completeNoul,
        actionableNoul: raw.actionableNoul,
        overallScore: raw.overallScore,
        overallConfidence: raw.overallConfidence,
        weights: {
          weightGrounded: agentCfg.confidence.weightGrounded,
          weightComplete: agentCfg.confidence.weightComplete,
          weightActionable: agentCfg.confidence.weightActionable,
          weightOverall: agentCfg.confidence.weightOverall,
        },
      }),
    });

    // Don't overwrite approved/blocked statuses on recompute.
    const preserveStatus =
      item.status === "approved" ||
      item.status === "blocked" ||
      item.status === "triaged";
    const status = preserveStatus ? item.status : gate.status;

    await query(
      `UPDATE regpilot_items SET confidence=$2, status=$3, judgments=$4 WHERE id=$1`,
      [itemId, score, status, JSON.stringify(nextJudgments)]
    );
    await audit(
      itemId,
      "gate",
      "confidence.recompute",
      `score=${score.toFixed(2)} status=${status}`
    );

    return NextResponse.json({
      itemId,
      score,
      gate,
      status,
      judgments: nextJudgments,
    });
  } catch (e) {
    console.error("[confidence/recompute]", (e as Error).message);
    return NextResponse.json({ error: "Recompute failed" }, { status: 500 });
  }
}
