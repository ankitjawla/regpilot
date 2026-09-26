import { NextRequest, NextResponse } from "next/server";
import { query, audit } from "@/lib/db";
import { rateLimited, clientIp } from "@/lib/ratelimit";
import { dispositionLabel } from "@/lib/line-find";
import {
  typesafeConfigured,
  typesafeLineFind,
} from "@/lib/typesafe";

export const maxDuration = 60;

/**
 * Examiner line-find — POST { item_id, query, topK? }.
 * Uses redacted source from DB; returns ephemeral hits (audits source.find).
 */
export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  try {
    if (!typesafeConfigured()) {
      return NextResponse.json(
        { error: "TYPESAFE_API_KEY is required for line-find" },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      item_id?: number;
      itemId?: number;
      query?: string;
      topK?: number;
    };
    const itemId = Number(body.item_id ?? body.itemId);
    const queryText = typeof body.query === "string" ? body.query.trim() : "";
    if (!itemId) {
      return NextResponse.json(
        { error: "item_id is required" },
        { status: 400 }
      );
    }
    if (!queryText) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }
    if (queryText.length > 500) {
      return NextResponse.json(
        { error: "query must be 500 characters or fewer" },
        { status: 400 }
      );
    }

    const items = await query<{
      id: number;
      source_text_redacted: string;
      status: string;
    }>(
      `SELECT id, source_text_redacted, status FROM regpilot_items WHERE id=$1`,
      [itemId]
    );
    const item = items[0];
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!item.source_text_redacted?.trim()) {
      return NextResponse.json(
        { error: "Item has no redacted source text" },
        { status: 400 }
      );
    }

    const topK = Math.min(8, Math.max(1, Number(body.topK) || 4));
    const result = await typesafeLineFind({
      source: item.source_text_redacted,
      query: queryText,
      topK,
    });

    await audit(
      itemId,
      result.model,
      "source.find",
      JSON.stringify({
        query: result.query,
        existsNoul: result.existsNoul,
        disposition: result.disposition,
        topIds: result.hits.map((h) => h.id),
        latencyMs: result.latencyMs,
        windowed: result.windowed,
      })
    ).catch((e) =>
      console.error("[find] audit failed:", (e as Error).message?.slice(0, 80))
    );

    return NextResponse.json({
      itemId,
      query: result.query,
      existsNoul: result.existsNoul,
      disposition: result.disposition,
      dispositionLabel: dispositionLabel(result.disposition),
      lineCount: result.lineCount,
      hits: result.hits,
      model: result.model,
      latencyMs: result.latencyMs,
      windowed: result.windowed,
    });
  } catch (e) {
    const msg = (e as Error).message || "Line-find failed";
    console.error("[find]", msg);
    const typesafeDown =
      /403|401|RBAC|TYPESAFE|Authentication|Unauthorized|PermissionDenied|not configured/i.test(
        msg
      );
    return NextResponse.json(
      {
        error: typesafeDown
          ? `TypeSafe unavailable for line-find: ${msg.slice(0, 160)}`
          : "Line-find failed. Please try again.",
        detail: msg.slice(0, 200),
      },
      { status: typesafeDown ? 503 : 500 }
    );
  }
}
