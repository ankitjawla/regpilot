import { NextRequest, NextResponse } from "next/server";
import { jevGuardrail, jevClassify, routeDecision } from "@/lib/jev";
import { query, audit } from "@/lib/db";
import { rateLimited, clientIp } from "@/lib/ratelimit";
import { getAgentConfig } from "@/lib/agent-store";
import { DEFAULT_AGENT_CONFIG } from "@/lib/agents";
import {
  triageJudgmentsFromTypesafe,
  type ItemJudgments,
} from "@/lib/provenance";
import {
  bandCfgFromAgent,
  maybeBeamClassify,
  enrichTriageJudgments,
  taxonomyFromTriage,
} from "@/lib/enhance";

export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
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

    const triage = await jevClassify(
      redacted,
      origin,
      jev.full,
      jev.typesafe
    );
    const taxonomy = taxonomyFromTriage(
      triage,
      agentCfg.triage.coarseTaxonomyCutoff
    );
    const beam = await maybeBeamClassify(
      redacted,
      agentCfg.triage.beamClassifyEnabled
    );

    const route = routeDecision(triage, {
      escalateNoul: jev.typesafe?.escalate.noul ?? null,
      escalateFullPathThreshold: agentCfg.triage.escalateFullPathThreshold,
      fastPathMinConfidence: agentCfg.triage.fastPathMinConfidence,
      escalateConfidenceCeiling: agentCfg.triage.escalateConfidenceCeiling,
      routineCategories: agentCfg.router.routineCategories,
    });

    let judgments: ItemJudgments | null = jev.typesafe
      ? {
          triage: enrichTriageJudgments(
            triageJudgmentsFromTypesafe(jev.typesafe, {
              bandCfg: bands,
              taxonomy,
              beam: beam || undefined,
            }),
            triage,
            agentCfg,
            beam
          ),
        }
      : null;

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
        judgments ? JSON.stringify(judgments) : null,
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
        anyUncertain: judgments?.triage?.anyUncertain,
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
        hasTriageJudgments: Boolean(judgments?.triage),
      })
    );

    const decisions = judgments?.triage
      ? {
          injectionNoul: judgments.triage.injectionNoul,
          injectionBand: judgments.triage.injectionBand,
          escalateNoul: judgments.triage.escalateNoul,
          escalateBand: judgments.triage.escalateBand,
          category: judgments.triage.category,
          urgency: judgments.triage.urgency,
          jurisdiction: judgments.triage.jurisdiction,
          taxonomy: judgments.triage.taxonomy,
          beam: judgments.triage.beam,
          anyUncertain: judgments.triage.anyUncertain,
        }
      : null;

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
        taxonomy,
        anyUncertain: judgments?.triage?.anyUncertain,
      },
      decisions,
      provenance: {
        policy_version: agentCfg.version,
        preset: agentCfg.preset,
        judgments,
      },
      jev: { model: triage.jev.model, latencyMs: triage.jev.latencyMs },
      route: { fastPath: route.fastPath, model: route.model, reason: route.reason },
    });
  } catch (e) {
    console.error("[triage]", (e as Error).message);
    return NextResponse.json(
      { error: "Triage failed. Please try again." },
      { status: 500 }
    );
  }
}
