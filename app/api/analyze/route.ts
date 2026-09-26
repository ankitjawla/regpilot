import { NextRequest, NextResponse } from "next/server";
import {
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
import { DEFAULT_AGENT_CONFIG } from "@/lib/agents";

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
      source_text_redacted: string;
      category: string;
      urgency: string;
      jurisdiction: string;
      confidence: number;
      fast_path: boolean;
      status: string;
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
    } as Parameters<typeof extractObligations>[1];

    const obligations = await extractObligations(item.source_text_redacted, triage);
    await audit(itemId, bigDeployment(), "obligations.extract", `${obligations.length} obligation(s) extracted`);

    const { memo, modelUsed } = await draftMemo(
      item.source_text_redacted,
      triage,
      obligations,
      item.fast_path
    );
    await audit(itemId, modelUsed, "memo.draft", item.fast_path ? "fast path (small model)" : "full analysis (large model)");

    const confidence = await jevConfidence(
      memo,
      obligations,
      triage,
      req.nextUrl.origin
    );

    const agentCfg = await getAgentConfig().catch(() => DEFAULT_AGENT_CONFIG);

    let grounding = null;
    if (
      agentCfg.grounding.enabled &&
      typesafeConfigured() &&
      obligations.length > 0
    ) {
      try {
        const g = await typesafeGroundObligations({
          source: item.source_text_redacted,
          obligations,
          memo,
        });
        grounding = {
          model: g.model,
          overallSupported: g.overallSupported,
          inventedClaims: g.inventedClaims,
          unsupportedCount: g.unsupportedCount,
          obligations: g.obligations,
          latencyMs: g.latencyMs,
        };
        const softFail =
          g.overallSupported < agentCfg.grounding.supportThreshold ||
          g.inventedClaims > agentCfg.grounding.inventedThreshold;
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
          "[analyze] grounding unavailable:",
          (e as Error).message?.slice(0, 120)
        );
      }
    }

    await audit(
      itemId,
      confidence.model,
      "confidence.score",
      `score=${confidence.score.toFixed(2)}: ${confidence.reasons.slice(0, 3).join("; ")}`
    );

    const gate = gateDecision(confidence.score, {
      autoApproveAbove: agentCfg.gate.autoApproveAbove,
      humanConfirmAbove: agentCfg.gate.humanConfirmAbove,
    });
    await audit(itemId, "gate", `gate.${gate.status}`, gate.label);

    await query(`DELETE FROM regpilot_obligations WHERE item_id=$1`, [itemId]);
    for (const o of obligations) {
      await query(
        `INSERT INTO regpilot_obligations(item_id, owner, action, due_date, source_quote)
         VALUES ($1,$2,$3,$4,$5)`,
        [itemId, o.owner, o.action, o.due_date, o.source_quote]
      );
    }
    await query(`DELETE FROM regpilot_drafts WHERE item_id=$1`, [itemId]);
    await query(
      `INSERT INTO regpilot_drafts(item_id, memo_text, model_used) VALUES ($1,$2,$3)`,
      [itemId, memo, modelUsed]
    );
    await query(
      `UPDATE regpilot_items SET confidence=$2, status=$3 WHERE id=$1`,
      [itemId, confidence.score, gate.status]
    );

    return NextResponse.json({
      itemId,
      obligations,
      memo,
      modelUsed,
      confidence,
      grounding,
      gate,
      status: gate.status,
    });
  } catch (e) {
    console.error("[analyze]", (e as Error).message);
    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}
