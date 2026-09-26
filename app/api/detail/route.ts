import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { playbookForText } from "@/lib/playbooks";

/** Full item package for the detail page (item + obligations + draft + audit). */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = Number(searchParams.get("item_id"));
    if (!itemId) {
      return NextResponse.json({ error: "item_id required" }, { status: 400 });
    }

    const items = await query<{
      id: number;
      title: string;
      category: string | null;
      urgency: string | null;
      jurisdiction: string | null;
      confidence: number | null;
      fast_path: boolean;
      status: string;
      source_text_redacted: string;
      created_at: string;
    }>(`SELECT * FROM regpilot_items WHERE id=$1`, [itemId]);
    const item = items[0];
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const obligations = await query(
      `SELECT owner, action, due_date, source_quote FROM regpilot_obligations WHERE item_id=$1 ORDER BY id`,
      [itemId]
    );
    const drafts = await query<{ memo_text: string; model_used: string }>(
      `SELECT memo_text, model_used FROM regpilot_drafts WHERE item_id=$1 ORDER BY id DESC LIMIT 1`,
      [itemId]
    );
    const audits = await query<{
      id: number;
      actor: string;
      action: string;
      detail: string | null;
      created_at: string;
    }>(
      `SELECT id, actor, action, detail, created_at FROM regpilot_audit WHERE item_id=$1 ORDER BY created_at ASC`,
      [itemId]
    );

    const groundingRow = [...audits]
      .reverse()
      .find((a) => a.action === "grounding.check");
    let grounding = null;
    if (groundingRow?.detail) {
      try {
        grounding = JSON.parse(groundingRow.detail);
      } catch {
        grounding = { details: groundingRow.detail };
      }
    }

    const playbook = playbookForText({
      title: item.title,
      category: item.category,
      source: item.source_text_redacted.slice(0, 2000),
    });

    return NextResponse.json({
      item,
      obligations,
      memo: drafts[0]?.memo_text || "",
      modelUsed: drafts[0]?.model_used || "",
      confidence: {
        score: item.confidence,
        reasons: [] as string[],
        note:
          audits
            .filter((a) => a.action === "confidence.score")
            .slice(-1)[0]?.detail || "",
      },
      grounding,
      playbook,
      audit: audits,
    });
  } catch (e) {
    console.error("[detail]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load detail" }, { status: 500 });
  }
}
