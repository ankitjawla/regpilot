import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  buildExportMarkdown,
  type ExportPackage,
  type ExportAudit,
} from "@/lib/export";
import { getAgentConfig } from "@/lib/agent-store";
import { DEFAULT_AGENT_CONFIG } from "@/lib/agents";
import { parseJudgments } from "@/lib/provenance";

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
      policy_version: number | null;
      preset: string | null;
      judgments: unknown;
    }>(`SELECT * FROM regpilot_items WHERE id=$1`, [itemId]);
    const row = items[0];
    if (!row) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const judgments = parseJudgments(row.judgments);
    const {
      judgments: _rawJudgments,
      policy_version,
      preset,
      ...itemRest
    } = row;
    void _rawJudgments;

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

    let grounding: ExportPackage["grounding"] = judgments?.grounding
      ? {
          model: judgments.grounding.model,
          overallSupported: judgments.grounding.overallSupported,
          inventedClaims: judgments.grounding.inventedClaims,
          unsupportedCount: judgments.grounding.unsupportedCount,
          softFail: judgments.grounding.softFail,
          details: judgments.grounding.softFail
            ? "Grounding soft-fail"
            : undefined,
        }
      : null;
    if (!grounding) {
      const groundingRow = [...audit]
        .reverse()
        .find((a) => a.action === "grounding.check");
      if (groundingRow?.detail) {
        try {
          grounding = JSON.parse(
            groundingRow.detail
          ) as ExportPackage["grounding"];
        } catch {
          grounding = { details: groundingRow.detail };
        }
      }
    }

    const provenance = {
      policy_version: policy_version ?? null,
      preset: preset ?? null,
      judgments,
    };

    const pkg: ExportPackage = {
      exportedAt: new Date().toISOString(),
      item: {
        ...itemRest,
        policy_version: policy_version ?? null,
        preset: preset ?? null,
        created_at:
          typeof itemRest.created_at === "string"
            ? itemRest.created_at
            : new Date(itemRest.created_at).toISOString(),
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
      provenance,
    };

    const agentCfg = await getAgentConfig().catch(() => DEFAULT_AGENT_CONFIG);

    if (format === "md" || format === "markdown") {
      const md = buildExportMarkdown(pkg, {
        titlePrefix: agentCfg.console.exportTitlePrefix,
        footer: agentCfg.console.exportFooter,
        orgName: agentCfg.console.orgName,
      });
      return new NextResponse(md, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="regpilot-item-${itemId}.md"`,
        },
      });
    }

    return NextResponse.json({
      ...pkg,
      policy_version: provenance.policy_version,
      preset: provenance.preset,
      judgments,
      console: {
        orgName: agentCfg.console.orgName,
        exportTitlePrefix: agentCfg.console.exportTitlePrefix,
      },
    });
  } catch (e) {
    console.error("[export]", (e as Error).message);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
