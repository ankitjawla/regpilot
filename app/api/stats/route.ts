import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const [totals] = await query<{
      total: string;
      fast_path_count: string;
      avg_confidence: string;
      pending_count: string;
    }>(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE fast_path) AS fast_path_count,
              AVG(confidence) FILTER (WHERE confidence IS NOT NULL) AS avg_confidence,
              COUNT(*) FILTER (WHERE status IN ('pending_review','needs_work')) AS pending_count
       FROM regpilot_items`
    );
    const byCat = await query<{ category: string; n: string }>(
      `SELECT COALESCE(category,'Unclassified') AS category, COUNT(*) AS n
       FROM regpilot_items GROUP BY 1 ORDER BY 2 DESC`
    );
    const recent = await query<{
      id: number;
      title: string;
      category: string;
      urgency: string;
      jurisdiction: string;
      confidence: number;
      fast_path: boolean;
      status: string;
      created_at: string;
    }>(
      `SELECT id, title, category, urgency, jurisdiction, confidence, fast_path, status, created_at
       FROM regpilot_items ORDER BY created_at DESC LIMIT 10`
    );
    const total = Number(totals.total);
    return NextResponse.json({
      total,
      fastPathPct: total ? Math.round((Number(totals.fast_path_count) / total) * 100) : 0,
      avgConfidence:
        totals.avg_confidence != null ? Number(Number(totals.avg_confidence).toFixed(2)) : null,
      pendingCount: Number(totals.pending_count),
      byCategory: byCat,
      recent,
    });
  } catch (e) {
    console.error("[stats]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
