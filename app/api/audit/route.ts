import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("item_id");
    const actor = searchParams.get("actor");
    const q = searchParams.get("q");

    const conds: string[] = [];
    const params: unknown[] = [];
    if (itemId) {
      params.push(Number(itemId));
      conds.push(`a.item_id = $${params.length}`);
    }
    if (actor) {
      params.push(actor);
      conds.push(`a.actor = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conds.push(`(a.action ILIKE $${params.length} OR a.detail ILIKE $${params.length} OR COALESCE(i.title,'') ILIKE $${params.length})`);
    }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const rows = await query(
      `SELECT a.id, a.item_id, i.title, a.actor, a.action, a.detail, a.created_at
       FROM regpilot_audit a
       LEFT JOIN regpilot_items i ON i.id = a.item_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT 200`,
      params
    );
    return NextResponse.json({ entries: rows });
  } catch (e) {
    console.error("[audit]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load audit log" }, { status: 500 });
  }
}
