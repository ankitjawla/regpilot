import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { rateLimited, clientIp } from "@/lib/ratelimit";
import { getAgentConfig } from "@/lib/agent-store";
import { DEFAULT_AGENT_CONFIG } from "@/lib/agents";
import { SAMPLES } from "@/lib/samples";
import { typesafeConfigured, typesafeTriage } from "@/lib/typesafe";
import { redactPII } from "@/lib/redact";
import { noulBand, choiceBand } from "@/lib/bands";
import { bandCfgFromAgent } from "@/lib/enhance";

/**
 * Calibration / eval harness — replay built-in samples through TypeSafe triage,
 * report precision@band proxies, suggest thresholds. Stores runs; no item writes.
 */
export async function GET() {
  try {
    const runs = await query<{
      id: number;
      created_at: string;
      sample_count: number;
      summary: unknown;
      suggestions: unknown;
      policy_version: number | null;
    }>(
      `SELECT id, created_at, sample_count, summary, suggestions, policy_version
       FROM regpilot_eval_runs ORDER BY created_at DESC LIMIT 20`
    );
    return NextResponse.json({ runs });
  } catch (e) {
    console.error("[eval GET]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load eval runs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  try {
    if (!typesafeConfigured()) {
      return NextResponse.json(
        { error: "TYPESAFE_API_KEY is required for eval" },
        { status: 400 }
      );
    }
    const body = (await req.json().catch(() => ({}))) as {
      limit?: number;
      sampleIds?: string[];
    };
    const agentCfg = await getAgentConfig().catch(() => DEFAULT_AGENT_CONFIG);
    const bands = bandCfgFromAgent(agentCfg);
    const limit = Math.min(12, Math.max(1, body.limit ?? 6));
    const pool =
      Array.isArray(body.sampleIds) && body.sampleIds.length
        ? SAMPLES.filter((s) => body.sampleIds!.includes(s.id))
        : SAMPLES;
    const samples = pool.slice(0, limit);

    type Row = {
      id: string;
      title: string;
      expectedFramework: string;
      category: string;
      categoryConfidence: number;
      categoryBand: string;
      injectionNoul: number;
      injectionBand: string;
      escalateNoul: number;
      escalateBand: string;
      latencyMs: number;
    };

    const rows: Row[] = [];
    let certainCorrect = 0;
    let certainTotal = 0;
    let uncertainTotal = 0;
    const injectionUncertain = { low: 0, mid: 0, high: 0 };

    for (const sample of samples) {
      const { redacted } = redactPII(sample.text);
      const t = await typesafeTriage(redacted);
      const catBand = choiceBand(t.category.confidence, bands);
      const injBand = noulBand(t.injection.noul, bands);
      const escBand = noulBand(t.escalate.noul, bands);
      rows.push({
        id: sample.id,
        title: sample.title,
        expectedFramework: sample.framework,
        category: t.category.choice,
        categoryConfidence: t.category.confidence,
        categoryBand: catBand,
        injectionNoul: t.injection.noul,
        injectionBand: injBand,
        escalateNoul: t.escalate.noul,
        escalateBand: escBand,
        latencyMs: t.latencyMs,
      });
      if (catBand === "uncertain") {
        uncertainTotal += 1;
      } else {
        certainTotal += 1;
        if (heuristicLabelMatch(sample.framework, t.category.choice)) {
          certainCorrect += 1;
        }
      }
      if (injBand === "uncertain") injectionUncertain.mid += 1;
      else if (t.injection.noul < bands.noulUncertainLow)
        injectionUncertain.low += 1;
      else injectionUncertain.high += 1;
    }

    const precisionAtCertain =
      certainTotal > 0 ? certainCorrect / certainTotal : null;
    const uncertainRate = rows.length ? uncertainTotal / rows.length : 0;

    const suggestions: string[] = [];
    if (uncertainRate > 0.5) {
      suggestions.push(
        `High uncertain rate (${(uncertainRate * 100).toFixed(0)}%) — consider lowering choiceMinConfidence (now ${bands.choiceMinConfidence.toFixed(2)}) or narrowing noul band.`
      );
    } else if (
      uncertainRate < 0.1 &&
      precisionAtCertain != null &&
      precisionAtCertain < 0.7
    ) {
      suggestions.push(
        `Few uncertain labels but precision@certain is low (${(precisionAtCertain * 100).toFixed(0)}%) — raise choiceMinConfidence toward 0.7+.`
      );
    } else {
      suggestions.push(
        `Bands look workable: uncertain ${(uncertainRate * 100).toFixed(0)}%, precision@certain ${
          precisionAtCertain != null
            ? `${(precisionAtCertain * 100).toFixed(0)}%`
            : "n/a"
        }.`
      );
    }
    if (injectionUncertain.mid > rows.length * 0.3) {
      suggestions.push(
        "Many injection nouls in the mid band — tune guardrail.injectionBlockThreshold against live traffic."
      );
    }

    const summary = {
      sampleCount: rows.length,
      certainTotal,
      certainCorrect,
      uncertainTotal,
      precisionAtCertain,
      uncertainRate,
      injectionUncertain,
      bands,
      rows,
    };

    const inserted = await query<{ id: number }>(
      `INSERT INTO regpilot_eval_runs(sample_count, summary, suggestions, policy_version)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [
        rows.length,
        JSON.stringify(summary),
        JSON.stringify(suggestions),
        agentCfg.version,
      ]
    );

    return NextResponse.json({
      runId: inserted[0]?.id,
      policy_version: agentCfg.version,
      summary,
      suggestions,
    });
  } catch (e) {
    console.error("[eval POST]", (e as Error).message);
    return NextResponse.json(
      { error: "Eval run failed. Please try again." },
      { status: 500 }
    );
  }
}

function heuristicLabelMatch(framework: string, category: string): boolean {
  const f = framework.toLowerCase();
  switch (category) {
    case "Capital":
      return (
        f.includes("ccar") ||
        f.includes("corep") ||
        f.includes("capital") ||
        f.includes("call")
      );
    case "Liquidity":
      return f.includes("liquidity") || f.includes("lcr") || f.includes("nsfr");
    case "AML-BSA":
      return (
        f.includes("bsa") ||
        f.includes("aml") ||
        f.includes("ofac") ||
        f.includes("sar")
      );
    case "Consumer Compliance":
      return f.includes("consumer") || f.includes("udaap") || f.includes("cfpb");
    case "Operational Risk":
      return (
        f.includes("operational") ||
        f.includes("cyber") ||
        f.includes("dodd") ||
        f.includes("volcker") ||
        f.includes("finrep")
      );
    case "Other":
      return true;
    default: {
      const _exhaustive: never = category as never;
      void _exhaustive;
      return false;
    }
  }
}
