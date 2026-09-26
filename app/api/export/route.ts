import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  buildExportMarkdown,
  type ExportPackage,
  type ExportAudit,
} from "@/lib/export";

export async function GET(req: NextRequest) {
  try {
    const itemId = Number(req.nextUrl.searchParams.get("item_id"));
    const format = (req.nextUrl.searchParams.get("format") || "json").toLowerCase();
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

    const obligations = await query<{
      owner: string;
      action: string;
      due_date: string;
      source_quote: string;
    }>(
      `SELECT owner, action, due_date, source_quote FROM regpilot_obligations WHERE item_id=$1 ORDER BY id`,
      [itemId]
    );
    const drafts = await query<{ memo_text: string; model_used: string }>(
      `SELECT memo_text, model_used FROM regpilot_drafts WHERE item_id=$1 ORDER BY id DESC LIMIT 1`,
      [itemId]
    );
    const audit = await query<ExportAudit>(
      `SELECT actor, action, detail, created_at FROM regpilot_audit WHERE item_id=$1 ORDER BY created_at ASC`,
      [itemId]
    );

    const groundingRow = [...audit]
      .reverse()
      .find((a) => a.action === "grounding.check");
    let grounding: ExportPackage["grounding"] = null;
    if (groundingRow?.detail) {
      try {
        grounding = JSON.parse(groundingRow.detail) as ExportPackage["grounding"];
      } catch {
        grounding = { details: groundingRow.detail };
      }
    }

    const pkg: ExportPackage = {
      exportedAt: new Date().toISOString(),
      item: {
        ...item,
        created_at:
          typeof item.created_at === "string"
            ? item.created_at
            : new Date(item.created_at).toISOString(),
      },
      obligations,
      memo: drafts[0]?.memo_text || "",
      modelUsed: drafts[0]?.model_used || "",
      audit: audit.map((a) => ({
        ...a,
        created_at:
          typeof a.created_at === "string"
            ? a.created_at
            : new Date(a.created_at).toISOString(),
      })),
      grounding,
    };

    if (format === "md" || format === "markdown") {
      const md = buildExportMarkdown(pkg);
      return new NextResponse(md, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="regpilot-item-${itemId}.md"`,
        },
      });
    }

    return NextResponse.json(pkg);
  } catch (e) {
    console.error("[export]", (e as Error).message);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
