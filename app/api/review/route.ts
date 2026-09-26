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

// POST: approve or request changes (single or bulk via itemIds)
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      itemId?: number;
      itemIds?: number[];
      decision?: "approve" | "needs_work";
      note?: string;
    };
    const { decision, note } = body;
    if (decision !== "approve" && decision !== "needs_work") {
      return NextResponse.json(
        { error: "decision must be approve or needs_work" },
        { status: 400 }
      );
    }
    const ids = Array.isArray(body.itemIds)
      ? body.itemIds.filter((n) => typeof n === "number" && n > 0)
      : typeof body.itemId === "number"
        ? [body.itemId]
        : [];
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "itemId or itemIds required" },
        { status: 400 }
      );
    }
    if (ids.length > 50) {
      return NextResponse.json(
        { error: "At most 50 items per bulk review" },
        { status: 400 }
      );
    }

    const status = decision === "approve" ? "approved" : "needs_work";
    const action =
      decision === "approve" ? "review.approve" : "review.request_changes";
    const detail = note ? note.slice(0, 500) : undefined;

    for (const itemId of ids) {
      await query(`UPDATE regpilot_items SET status=$2 WHERE id=$1`, [
        itemId,
        status,
      ]);
      await audit(itemId, "human", action, detail);
    }

    return NextResponse.json({
      itemIds: ids,
      itemId: ids.length === 1 ? ids[0] : undefined,
      status,
      count: ids.length,
    });
  } catch (e) {
    console.error("[review POST]", (e as Error).message);
    return NextResponse.json({ error: "Review update failed" }, { status: 500 });
  }
}
