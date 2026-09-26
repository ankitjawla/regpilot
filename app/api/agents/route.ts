import { NextRequest, NextResponse } from "next/server";
import { WORKFLOW_STEPS, DEFAULT_AGENT_CONFIG } from "@/lib/agents";
import { getAgentConfig, saveAgentConfig } from "@/lib/agent-store";
import { rateLimited, clientIp } from "@/lib/ratelimit";

export async function GET() {
  try {
    const config = await getAgentConfig();
    return NextResponse.json({
      config,
      defaults: DEFAULT_AGENT_CONFIG,
      workflow: WORKFLOW_STEPS,
    });
  } catch (e) {
    console.error("[agents GET]", (e as Error).message);
    return NextResponse.json(
      {
        config: DEFAULT_AGENT_CONFIG,
        defaults: DEFAULT_AGENT_CONFIG,
        workflow: WORKFLOW_STEPS,
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
    const config = await saveAgentConfig(body.config ?? body);
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
  // Reset to defaults
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  try {
    const body = (await req.json().catch(() => ({}))) as { reset?: boolean };
    if (body.reset) {
      const config = await saveAgentConfig(DEFAULT_AGENT_CONFIG);
      return NextResponse.json({ config, ok: true, reset: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[agents POST]", (e as Error).message);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
