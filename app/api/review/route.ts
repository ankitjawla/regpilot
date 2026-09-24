import { NextRequest, NextResponse } from "next/server";
import { query, audit } from "@/lib/db";

// GET: review queue (pending_review + needs_work), newest first
export async function GET() {
  try {
    const items = await query<{
      id: number;
      title: string;
      category: string;
      urgency: string;
      jurisdiction: string;
      confidence: number;
      fast_path: boolean;
      status: string;
      created_at: string;
      obligation_count: string;
    }>(
      `SELECT i.*, COUNT(o.id) AS obligation_count
       FROM regpilot_items i
       LEFT JOIN regpilot_obligations o ON o.item_id = i.id
       WHERE i.status IN ('pending_review','needs_work')
       GROUP BY i.id
       ORDER BY i.created_at DESC
       LIMIT 100`
    );
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[review GET]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load queue" }, { status: 500 });
  }
}

// POST: approve or request changes
export async function POST(req: NextRequest) {
  try {
    const { itemId, decision, note } = (await req.json()) as {
      itemId?: number;
      decision?: "approve" | "needs_work";
      note?: string;
    };
    if (!itemId || (decision !== "approve" && decision !== "needs_work")) {
      return NextResponse.json({ error: "itemId and decision are required" }, { status: 400 });
    }
    const status = decision === "approve" ? "approved" : "needs_work";
    await query(`UPDATE regpilot_items SET status=$2 WHERE id=$1`, [itemId, status]);
    await audit(
      itemId,
      "human",
      decision === "approve" ? "review.approve" : "review.request_changes",
      note ? note.slice(0, 500) : undefined
    );
    return NextResponse.json({ itemId, status });
  } catch (e) {
    console.error("[review POST]", (e as Error).message);
    return NextResponse.json({ error: "Review update failed" }, { status: 500 });
  }
}
