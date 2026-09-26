import { NextRequest, NextResponse } from "next/server";
import {
  jevGuardrail,
  jevClassify,
  routeDecision,
  extractObligationsCascade,
  draftMemo,
  jevConfidence,
  gateDecision,
} from "@/lib/jev";
import { bigDeployment } from "@/lib/azure";
import { query, audit } from "@/lib/db";
import { rateLimited, clientIp } from "@/lib/ratelimit";
import { getAgentConfig } from "@/lib/agent-store";
import {
  DEFAULT_AGENT_CONFIG,
  resolveMemoSystemPrompt,
} from "@/lib/agents";
import {
  triageJudgmentsFromTypesafe,
  confidenceJudgmentsFromScore,
  type ItemJudgments,
} from "@/lib/provenance";
import {
  bandCfgFromAgent,
  maybeBeamClassify,
  runPostDraftEnhancements,
  applyConfidencePatch,
  enrichTriageJudgments,
  taxonomyFromTriage,
} from "@/lib/enhance";
import type { StageEvent } from "@/lib/pipeline-events";

export const maxDuration = 120;

type Emit = (event: StageEvent) => void;

const SKIP_AFTER_BLOCK: StageEvent["id"][] = [
  "triage",
  "router",
  "fastpath",
  "draft",
  "dedupe",
  "grounding",
  "playbook",
  "hazard",
  "confidence",
  "gate",
];

function wantsStream(req: NextRequest): boolean {
  const accept = req.headers.get("accept") || "";
  return (
    accept.includes("text/event-stream") ||
    req.headers.get("x-regpilot-stream") === "1"
  );
}

type PipelineBody = { text?: string; title?: string };

/**
 * One-shot intake: guardrail → triage → route → obligations (cascade) → memo →
 * enhancements (dates/dedupe/grounding/playbook/hazard) → confidence → gate.
 * JSON by default. `Accept: text/event-stream` emits stage events then a result.
 */
export async function POST(req: NextRequest) {
  let body: PipelineBody;
  try {
    body = (await req.json()) as PipelineBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!wantsStream(req)) {
    const result = await executePipeline(req, body, () => {});
    return NextResponse.json(result.body, { status: result.status });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit: Emit = (event) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };
      try {
        const result = await executePipeline(req, body, emit);
        if (result.status >= 400) {
          const err = result.body as { error?: string; stage?: string };
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: err.error || "Pipeline failed",
                stage: err.stage,
              })}\n\n`
            )
          );
        } else {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "result", payload: result.body })}\n\n`
            )
          );
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: (e as Error).message || "Pipeline failed",
            })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

async function executePipeline(
  req: NextRequest,
  parsed: PipelineBody,
  emit: Emit
): Promise<{ status: number; body: unknown }> {
  if (rateLimited(clientIp(req))) {
    return { status: 429, body: { error: "Rate limit exceeded" } };
  }
  let stage = "init";
  try {
    const { text, title } = parsed;
    if (typeof text !== "string" || text.trim().length < 20) {
      return {
        status: 400,
        body: { error: "Please provide at least a few sentences of text." },
      };
    }
    if (text.length > 30000) {
      return {
        status: 400,
        body: { error: "Text is too long (max 30,000 characters)." },
      };
    }

    const cleanTitle =
      (typeof title === "string" && title.trim().slice(0, 120)) ||
      text.trim().replace(/\s+/g, " ").slice(0, 80);
    const origin = req.nextUrl.origin;
    const agentCfg = await getAgentConfig().catch(() => DEFAULT_AGENT_CONFIG);
    const bands = bandCfgFromAgent(agentCfg);

    emit({ type: "stage", id: "intake", state: "done" });
    emit({ type: "stage", id: "guardrail", state: "running" });
    stage = "guardrail";
    const { guardrail, redacted, jev } = await jevGuardrail(text, origin);
    if (guardrail.block) {
      const blockedJudgments: ItemJudgments | null = jev.typesafe
        ? {
            triage: triageJudgmentsFromTypesafe(jev.typesafe, {
              bandCfg: bands,
            }),
          }
        : null;
      const rows = await query<{ id: number }>(
        `INSERT INTO regpilot_items
           (title, source_text_redacted, status, policy_version, preset, judgments)
         VALUES ($1,$2,'blocked',$3,$4,$5) RETURNING id`,
        [
          cleanTitle,
          redacted,
          agentCfg.version,
          agentCfg.preset,
          blockedJudgments ? JSON.stringify(blockedJudgments) : null,
        ]
      );
      const itemId = rows[0].id;
      await audit(itemId, jev.model, "guardrail.block", guardrail.reason);
      await audit(
        itemId,
        "policy",
        "policy.stamp",
        JSON.stringify({
          policy_version: agentCfg.version,
          preset: agentCfg.preset,
        })
      );
      emit({
        type: "stage",
        id: "guardrail",
        state: "done",
        detail: guardrail.reason,
      });
      emit({
        type: "stage",
        id: "blocked",
        state: "blocked",
        detail: guardrail.reason,
      });
      for (const id of SKIP_AFTER_BLOCK) {
        emit({ type: "stage", id, state: "skipped" });
      }
      return {
        status: 200,
        body: {
          blocked: true,
          itemId,
          guardrail,
          jev: { model: jev.model, latencyMs: jev.latencyMs },
          provenance: {
            policy_version: agentCfg.version,
            preset: agentCfg.preset,
          },
        },
      };
    }

    emit({
      type: "stage",
      id: "guardrail",
      state: "done",
      detail: guardrail.reason,
    });
    emit({ type: "stage", id: "triage", state: "running" });
    stage = "triage";
    const triage = await jevClassify(redacted, origin, jev.full, jev.typesafe);
    const taxonomy = taxonomyFromTriage(
      triage,
      agentCfg.triage.coarseTaxonomyCutoff
    );
    const beam = await maybeBeamClassify(
      redacted,
      agentCfg.triage.beamClassifyEnabled
    );

    // Prefer coarse label for router routine check when configured.
    const routeCategory =
      agentCfg.router.preferCoarseForRouting && taxonomy.level === "coarse"
        ? triage.category
        : triage.category;
    void routeCategory;

    emit({
      type: "stage",
      id: "triage",
      state: "done",
      detail: `${triage.category} · ${triage.urgency}`,
    });
    emit({ type: "stage", id: "router", state: "running" });
    stage = "router";
    const route = routeDecision(triage, {
      escalateNoul: jev.typesafe?.escalate.noul ?? null,
      escalateFullPathThreshold: agentCfg.triage.escalateFullPathThreshold,
      fastPathMinConfidence: agentCfg.triage.fastPathMinConfidence,
      escalateConfidenceCeiling: agentCfg.triage.escalateConfidenceCeiling,
      routineCategories: agentCfg.router.routineCategories,
    });

    emit({
      type: "stage",
      id: "router",
      state: "done",
      detail: route.reason,
    });
    if (route.fastPath) {
      emit({
        type: "stage",
        id: "fastpath",
        state: "done",
        detail: route.model,
      });
    } else {
      emit({ type: "stage", id: "fastpath", state: "skipped" });
    }
    emit({
      type: "stage",
      id: "draft",
      state: "running",
      detail: route.fastPath ? "small model" : "full model",
    });

    const judgments: ItemJudgments = {};
    if (jev.typesafe) {
      judgments.triage = enrichTriageJudgments(
        triageJudgmentsFromTypesafe(jev.typesafe, {
          bandCfg: bands,
          taxonomy,
          beam: beam || undefined,
        }),
        triage,
        agentCfg,
        beam
      );
    }

    stage = "persist";
    const rows = await query<{ id: number }>(
      `INSERT INTO regpilot_items
         (title, source_text_redacted, category, urgency, jurisdiction, confidence, fast_path, status, policy_version, preset, judgments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'triaged',$8,$9,$10) RETURNING id`,
      [
        cleanTitle,
        redacted,
        triage.category,
        triage.urgency,
        triage.jurisdiction,
        triage.confidence,
        route.fastPath,
        agentCfg.version,
        agentCfg.preset,
        Object.keys(judgments).length ? JSON.stringify(judgments) : null,
      ]
    );
    const itemId = rows[0].id;
    await audit(itemId, jev.model, "guardrail.pass", guardrail.reason);
    await audit(
      itemId,
      triage.jev.model,
      "triage.classify",
      JSON.stringify({
        ...triage,
        taxonomy,
        anyUncertain: judgments.triage?.anyUncertain,
      })
    );
    await audit(
      itemId,
      "router",
      route.fastPath ? "route.fast_path" : "route.full_analysis",
      route.reason
    );
    await audit(
      itemId,
      "policy",
      "policy.stamp",
      JSON.stringify({
        policy_version: agentCfg.version,
        preset: agentCfg.preset,
        hasTriageJudgments: Boolean(judgments.triage),
      })
    );

    stage = "obligations";
    const { obligations: rawObs, cascade } = agentCfg.draft.enabled
      ? await extractObligationsCascade(redacted, triage, {
          systemPrompt: agentCfg.draft.obligationSystemPrompt,
          cascadeEnabled: agentCfg.draft.sdeCascadeEnabled,
          fireThreshold: agentCfg.draft.sdeFireThreshold,
        })
      : {
          obligations: [],
          cascade: {
            rung: "skipped" as const,
            verified: false,
          },
        };
    await audit(
      itemId,
      cascade.model || bigDeployment(),
      "obligations.extract",
      `${rawObs.length} obligation(s) · cascade rung=${cascade.rung}`
    );

    stage = "memo";
    const { memo, modelUsed } = agentCfg.draft.enabled
      ? await draftMemo(redacted, triage, rawObs, route.fastPath, {
          systemPrompt: resolveMemoSystemPrompt(agentCfg),
        })
      : {
          memo: "_Draft agent disabled in Settings / Agents._",
          modelUsed: "disabled",
        };
    await audit(
      itemId,
      modelUsed,
      "memo.draft",
      route.fastPath ? "fast path (small model)" : "full analysis (large model)"
    );
    emit({
      type: "stage",
      id: "draft",
      state: "done",
      detail: `${rawObs.length} obligation(s) · ${modelUsed}`,
    });

    emit({ type: "stage", id: "confidence", state: "running" });
    stage = "confidence";
    let confidence = await jevConfidence(
      memo,
      rawObs,
      triage,
      origin,
      agentCfg.confidence
    );

    stage = "enhance";
    const enhanced = await runPostDraftEnhancements({
      source: redacted,
      title: cleanTitle,
      memo,
      obligations: rawObs,
      triage,
      agentCfg,
      cascade,
      existingJudgments: judgments,
      onStage: (id, state, detail) => emit({ type: "stage", id, state, detail }),
    });
    Object.assign(judgments, enhanced.judgments);
    confidence = applyConfidencePatch(confidence, enhanced.confidencePatch);
    const obligations = enhanced.obligations;
    const grounding = enhanced.grounding;

    if (grounding) {
      await audit(
        itemId,
        grounding.model,
        "grounding.check",
        JSON.stringify({
          model: grounding.model,
          overallSupported: grounding.overallSupported,
          inventedClaims: grounding.inventedClaims,
          unsupportedCount: grounding.unsupportedCount,
          softFail: grounding.softFail,
          verdictCounts: grounding.verdictCounts,
          needsReview: grounding.needsReview,
        })
      );
    }
    if (judgments.hazard) {
      await audit(
        itemId,
        judgments.hazard.model,
        "hazard.screen",
        JSON.stringify(judgments.hazard)
      );
    }
    if (judgments.playbook) {
      await audit(
        itemId,
        judgments.playbook.model,
        "playbook.coverage",
        JSON.stringify({
          playbookId: judgments.playbook.playbookId,
          meanCoverage: judgments.playbook.meanCoverage,
          missing: judgments.playbook.missingSteps,
        })
      );
    }
    if (judgments.dueDates) {
      await audit(
        itemId,
        "typesafe",
        "due_date.extract",
        JSON.stringify({
          count: judgments.dueDates.extractions.length,
          anyNeedsReview: judgments.dueDates.anyNeedsReview,
        })
      );
    }
    if (judgments.dedupe) {
      await audit(
        itemId,
        judgments.dedupe.model,
        "obligations.dedupe",
        JSON.stringify({
          pairs: judgments.dedupe.pairs.length,
          merges: judgments.dedupe.mergeSuggestions.length,
        })
      );
    }
    if (judgments.cascade) {
      await audit(
        itemId,
        judgments.cascade.model || "cascade",
        "cascade.rung",
        JSON.stringify(judgments.cascade)
      );
    }

    judgments.confidence = confidenceJudgmentsFromScore({
      ...confidence,
      model: confidence.model,
      weights: {
        weightGrounded: agentCfg.confidence.weightGrounded,
        weightComplete: agentCfg.confidence.weightComplete,
        weightActionable: agentCfg.confidence.weightActionable,
        weightOverall: agentCfg.confidence.weightOverall,
      },
    });

    await audit(
      itemId,
      confidence.model,
      "confidence.score",
      `score=${confidence.score.toFixed(2)}: ${confidence.reasons.slice(0, 3).join("; ")}`
    );

    emit({
      type: "stage",
      id: "confidence",
      state: "done",
      detail: confidence.score.toFixed(2),
    });
    emit({ type: "stage", id: "gate", state: "running" });
    stage = "gate";
    const gate = gateDecision(confidence.score, {
      autoApproveAbove: agentCfg.gate.autoApproveAbove,
      humanConfirmAbove: agentCfg.gate.humanConfirmAbove,
      forceConfirmOnUncertain: agentCfg.gate.forceConfirmOnUncertain,
      anyUncertain: enhanced.confidencePatch.anyUncertain,
      dueDateNeedsReview: enhanced.confidencePatch.dueDateNeedsReview,
      dueDateForceConfirm: agentCfg.draft.dueDateForceConfirm,
      hazardDisposition: enhanced.confidencePatch.hazardDisposition,
      groundingNeedsReview: enhanced.confidencePatch.groundingNeedsReview,
    });
    await audit(itemId, "gate", `gate.${gate.status}`, gate.label);
    emit({
      type: "stage",
      id: "gate",
      state: "done",
      detail: gate.label || gate.status,
    });

    stage = "persist_results";
    for (const o of obligations) {
      await query(
        `INSERT INTO regpilot_obligations(item_id, owner, action, due_date, source_quote, due_date_iso, date_confidence, needs_review)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          itemId,
          o.owner,
          o.action,
          o.due_date,
          o.source_quote,
          o.due_date_iso ?? null,
          o.date_confidence ?? null,
          o.needs_review ?? false,
        ]
      );
    }
    await query(
      `INSERT INTO regpilot_drafts(item_id, memo_text, model_used) VALUES ($1,$2,$3)`,
      [itemId, memo, modelUsed]
    );
    await query(
      `UPDATE regpilot_items
       SET confidence=$2, status=$3, policy_version=$4, preset=$5, judgments=$6
       WHERE id=$1`,
      [
        itemId,
        confidence.score,
        gate.status,
        agentCfg.version,
        agentCfg.preset,
        JSON.stringify(judgments),
      ]
    );
    await audit(
      itemId,
      "policy",
      "policy.stamp",
      JSON.stringify({
        policy_version: agentCfg.version,
        preset: agentCfg.preset,
        hasGrounding: Boolean(judgments.grounding),
        hasConfidence: Boolean(judgments.confidence),
        hasHazard: Boolean(judgments.hazard),
        hasPlaybook: Boolean(judgments.playbook),
      })
    );

    return {
      status: 200,
      body: {
      blocked: gate.status === "blocked",
      itemId,
      guardrail: {
        piiFound: guardrail.piiFound,
        redactions: guardrail.redactions,
        injectionSuspected: guardrail.injectionSuspected,
        reason: guardrail.reason,
      },
      triage: {
        category: triage.category,
        urgency: triage.urgency,
        jurisdiction: triage.jurisdiction,
        confidence: triage.confidence,
        rationale: triage.rationale,
        taxonomy,
        anyUncertain: judgments.triage?.anyUncertain,
      },
      route: { fastPath: route.fastPath, model: route.model, reason: route.reason },
      jev: { model: triage.jev.model, latencyMs: triage.jev.latencyMs },
      obligations,
      memo,
      modelUsed,
      confidence,
      grounding,
      cascade,
      gate,
      status: gate.status,
      preset: agentCfg.preset,
      provenance: {
        policy_version: agentCfg.version,
        preset: agentCfg.preset,
        judgments,
      },
      },
    };
  } catch (e) {
    const msg = (e as Error).message || "unknown";
    console.error("[pipeline]", stage, msg);
    const safe = msg
      .replace(/sk-[a-zA-Z0-9]+/g, "[redacted]")
      .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
      .slice(0, 180);
    return {
      status: 500,
      body: {
        error: `Pipeline failed at ${stage}. ${safe}`,
        stage,
      },
    };
  }
}
