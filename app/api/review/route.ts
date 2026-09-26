import { NextRequest, NextResponse } from "next/server";
import { query, audit } from "@/lib/db";

// GET: review queue (pending_review + needs_work), newest first
// Optional ?uncertain=1 filters items with uncertain triage / citation / due-date flags
export async function GET(req: NextRequest) {
  try {
    const uncertainOnly =
      new URL(req.url).searchParams.get("uncertain") === "1";
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
      grounding_soft_fail: boolean | null;
      needs_human_confirm: boolean | null;
      any_uncertain: boolean | null;
    }>(
      `SELECT i.id, i.title, i.category, i.urgency, i.jurisdiction, i.confidence,
              i.fast_path, i.status, i.created_at,
              COUNT(o.id) AS obligation_count,
              COALESCE((i.judgments->'grounding'->>'softFail')::boolean, false) AS grounding_soft_fail,
              COALESCE(
                (i.judgments->'triage'->>'anyUncertain')::boolean
                OR COALESCE((i.judgments->'grounding'->>'needsReview')::boolean, false)
                OR COALESCE((i.judgments->'dueDates'->>'anyNeedsReview')::boolean, false)
                OR COALESCE((i.judgments->'hazard'->>'disposition') = 'review', false),
                false
              ) AS needs_human_confirm,
              COALESCE((i.judgments->'triage'->>'anyUncertain')::boolean, false) AS any_uncertain
       FROM regpilot_items i
       LEFT JOIN regpilot_obligations o ON o.item_id = i.id
       WHERE i.status IN ('pending_review','needs_work')
         ${
           uncertainOnly
             ? `AND (
                  COALESCE((i.judgments->'triage'->>'anyUncertain')::boolean, false)
                  OR COALESCE((i.judgments->'grounding'->>'needsReview')::boolean, false)
                  OR COALESCE((i.judgments->'dueDates'->>'anyNeedsReview')::boolean, false)
                )`
             : ""
         }
       GROUP BY i.id
       ORDER BY i.created_at DESC
       LIMIT 100`
    );
    return NextResponse.json({ items, uncertainOnly });
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
      decision?: "approve" | "needs_work" | "merge_obligations";
      note?: string;
      merge?: { keepIndex: number; dropIndex: number };
    };
    const { decision, note } = body;

    if (decision === "merge_obligations") {
      const itemId = body.itemId;
      const merge = body.merge;
      if (!itemId || !merge) {
        return NextResponse.json(
          { error: "itemId and merge required" },
          { status: 400 }
        );
      }
      const obs = await query<{
        id: number;
        owner: string;
        action: string;
        due_date: string;
        source_quote: string;
      }>(
        `SELECT id, owner, action, due_date, source_quote FROM regpilot_obligations WHERE item_id=$1 ORDER BY id`,
        [itemId]
      );
      const keep = obs[merge.keepIndex];
      const drop = obs[merge.dropIndex];
      if (!keep || !drop) {
        return NextResponse.json(
          { error: "Invalid merge indices" },
          { status: 400 }
        );
      }
      await query(`DELETE FROM regpilot_obligations WHERE id=$1`, [drop.id]);
      await audit(
        itemId,
        "human",
        "review.merge_obligations",
        note ||
          `Merged #${merge.dropIndex} into #${merge.keepIndex}: kept "${keep.action.slice(0, 80)}"`
      );
      return NextResponse.json({
        itemId,
        status: "merged",
        keptId: keep.id,
        droppedId: drop.id,
      });
    }

    if (decision !== "approve" && decision !== "needs_work") {
      return NextResponse.json(
        { error: "decision must be approve, needs_work, or merge_obligations" },
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
