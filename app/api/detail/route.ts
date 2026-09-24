import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Item detail for the review page: stored obligations + draft + confidence.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = Number(searchParams.get("item_id"));
    if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });

    const obligations = await query(
      `SELECT owner, action, due_date, source_quote FROM regpilot_obligations WHERE item_id=$1 ORDER BY id`,
      [itemId]
    );
    const drafts = await query<{ memo_text: string; model_used: string }>(
      `SELECT memo_text, model_used FROM regpilot_drafts WHERE item_id=$1 ORDER BY id DESC LIMIT 1`,
      [itemId]
    );
    const items = await query<{ confidence: number }>(
      `SELECT confidence FROM regpilot_items WHERE id=$1`,
      [itemId]
    );
    const audits = await query<{ action: string; detail: string }>(
      `SELECT action, detail FROM regpilot_audit WHERE item_id=$1 AND action='confidence.score' ORDER BY id DESC LIMIT 1`,
      [itemId]
    );
    return NextResponse.json({
      obligations,
      memo: drafts[0]?.memo_text || "",
      modelUsed: drafts[0]?.model_used || "",
      confidence: { score: items[0]?.confidence ?? null, reasons: [] as string[], note: audits[0]?.detail || "" },
    });
  } catch (e) {
    console.error("[detail]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load detail" }, { status: 500 });
  }
}
