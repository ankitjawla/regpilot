import { NextRequest, NextResponse } from "next/server";
import { WORKFLOW_STEPS, DEFAULT_AGENT_CONFIG } from "@/lib/agents";
import { getAgentConfig, saveAgentConfig } from "@/lib/agent-store";
import { applyPreset, POLICY_PRESETS } from "@/lib/presets";
import { FRAMEWORK_PLAYBOOKS } from "@/lib/playbooks";
import { rateLimited, clientIp } from "@/lib/ratelimit";

export async function GET() {
  try {
    const config = await getAgentConfig();
    return NextResponse.json({
      config,
      defaults: DEFAULT_AGENT_CONFIG,
      workflow: WORKFLOW_STEPS,
      presets: Object.entries(POLICY_PRESETS).map(([id, p]) => ({
        id,
        label: p.label,
        description: p.description,
      })),
      playbooks: FRAMEWORK_PLAYBOOKS,
    });
  } catch (e) {
    console.error("[agents GET]", (e as Error).message);
    return NextResponse.json(
      {
        config: DEFAULT_AGENT_CONFIG,
        defaults: DEFAULT_AGENT_CONFIG,
        workflow: WORKFLOW_STEPS,
        presets: Object.entries(POLICY_PRESETS).map(([id, p]) => ({
          id,
          label: p.label,
          description: p.description,
        })),
        playbooks: FRAMEWORK_PLAYBOOKS,
        warning: "Using defaults — database unavailable",
      },
      { status: 200 }
    );
  }
}

export async function PUT(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  try {
    const body = await req.json();
    let incoming = body.config ?? body;
    if (body.preset && body.preset !== "custom") {
      const current = await getAgentConfig();
      incoming = applyPreset(current, body.preset);
    } else if (body.config && !body.config.preset) {
      incoming = { ...incoming, preset: "custom" };
    }
    const config = await saveAgentConfig(incoming);
    return NextResponse.json({ config, ok: true });
  } catch (e) {
    console.error("[agents PUT]", (e as Error).message);
    return NextResponse.json(
      { error: "Failed to save agent config" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as {
      reset?: boolean;
      preset?: "balanced" | "strict" | "lenient" | "exam_ready";
    };
    if (body.reset) {
      const config = await saveAgentConfig(DEFAULT_AGENT_CONFIG);
      return NextResponse.json({ config, ok: true, reset: true });
    }
    if (body.preset) {
      const current = await getAgentConfig();
      const config = await saveAgentConfig(applyPreset(current, body.preset));
      return NextResponse.json({ config, ok: true, preset: body.preset });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[agents POST]", (e as Error).message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
