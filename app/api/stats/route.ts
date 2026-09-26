import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const [totals] = await query<{
      total: string;
      fast_path_count: string;
      avg_confidence: string;
      pending_count: string;
      blocked_count: string;
      auto_approved_count: string;
      approved_count: string;
      critical_count: string;
    }>(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE fast_path) AS fast_path_count,
              AVG(confidence) FILTER (WHERE confidence IS NOT NULL) AS avg_confidence,
              COUNT(*) FILTER (WHERE status IN ('pending_review','needs_work')) AS pending_count,
              COUNT(*) FILTER (WHERE status = 'blocked') AS blocked_count,
              COUNT(*) FILTER (WHERE status = 'auto_approved') AS auto_approved_count,
              COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
              COUNT(*) FILTER (WHERE urgency = 'critical') AS critical_count
       FROM regpilot_items`
    );
    const byCat = await query<{ category: string; n: string }>(
      `SELECT COALESCE(category,'Unclassified') AS category, COUNT(*) AS n
       FROM regpilot_items GROUP BY 1 ORDER BY 2 DESC`
    );
    const byStatus = await query<{ status: string; n: string }>(
      `SELECT status, COUNT(*) AS n FROM regpilot_items GROUP BY 1 ORDER BY 2 DESC`
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
    const needsYou = await query<{
      id: number;
      title: string;
      category: string;
      urgency: string;
      confidence: number;
      status: string;
      created_at: string;
      obligation_count: string;
    }>(
      `SELECT i.id, i.title, i.category, i.urgency, i.confidence, i.status, i.created_at,
              COUNT(o.id) AS obligation_count
       FROM regpilot_items i
       LEFT JOIN regpilot_obligations o ON o.item_id = i.id
       WHERE i.status IN ('pending_review','needs_work')
       GROUP BY i.id
       ORDER BY
         CASE i.urgency WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         i.created_at ASC
       LIMIT 8`
    );
    const audit = await query<{
      id: number;
      item_id: number | null;
      title: string | null;
      actor: string;
      action: string;
      detail: string | null;
      created_at: string;
    }>(
      `SELECT a.id, a.item_id, i.title, a.actor, a.action, a.detail, a.created_at
       FROM regpilot_audit a
       LEFT JOIN regpilot_items i ON i.id = a.item_id
       ORDER BY a.created_at DESC
       LIMIT 12`
    );
    const [groundingSoft] = await query<{ n: string }>(
      `SELECT COUNT(DISTINCT item_id) AS n FROM regpilot_audit
       WHERE action = 'grounding.check'
         AND detail ILIKE '%"softFail":true%'`
    );
    const total = Number(totals.total);
    return NextResponse.json({
      total,
      fastPathPct: total
        ? Math.round((Number(totals.fast_path_count) / total) * 100)
        : 0,
      avgConfidence:
        totals.avg_confidence != null
          ? Number(Number(totals.avg_confidence).toFixed(2))
          : null,
      pendingCount: Number(totals.pending_count),
      blockedCount: Number(totals.blocked_count),
      autoApprovedCount: Number(totals.auto_approved_count),
      approvedCount: Number(totals.approved_count),
      criticalCount: Number(totals.critical_count),
      groundingSoftFailCount: Number(groundingSoft?.n || 0),
      byCategory: byCat,
      byStatus,
      recent,
      needsYou,
      audit,
    });
  } catch (e) {
    console.error("[stats]", (e as Error).message);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
