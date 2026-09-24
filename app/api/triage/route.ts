import { NextRequest, NextResponse } from "next/server";
import { jevGuardrail, jevClassify, routeDecision } from "@/lib/jev";
import { query, audit } from "@/lib/db";
import { rateLimited, clientIp } from "@/lib/ratelimit";

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

    // --- Guardrail (TypeSafe System One → local jev → Azure; redaction happens
    //     before ANY model sees the text)
    const { guardrail, redacted, jev } = await jevGuardrail(text, origin);

    if (guardrail.block) {
      const rows = await query<{ id: number }>(
        `INSERT INTO regpilot_items(title, source_text_redacted, status)
         VALUES ($1,$2,'blocked') RETURNING id`,
        [cleanTitle, redacted]
      );
      const itemId = rows[0].id;
      await audit(itemId, jev.model, "guardrail.block", guardrail.reason);
      return NextResponse.json({
        blocked: true,
        itemId,
        guardrail,
        jev: { model: jev.model, latencyMs: jev.latencyMs },
      });
    }

    // --- Triage (reuses TypeSafe or local result from the guardrail — one call)
    const triage = await jevClassify(
      redacted,
      origin,
      jev.full,
      jev.typesafe
    );
    const route = routeDecision(triage);

    const rows = await query<{ id: number }>(
      `INSERT INTO regpilot_items
         (title, source_text_redacted, category, urgency, jurisdiction, confidence, fast_path, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'triaged') RETURNING id`,
      [
        cleanTitle,
        redacted,
        triage.category,
        triage.urgency,
        triage.jurisdiction,
        triage.confidence,
        route.fastPath,
      ]
    );
    const itemId = rows[0].id;

    await audit(itemId, jev.model, "guardrail.pass", guardrail.reason);
    await audit(itemId, triage.jev.model, "triage.classify", JSON.stringify(triage));
    await audit(
      itemId,
      "router",
      route.fastPath ? "route.fast_path" : "route.full_analysis",
      route.reason
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
