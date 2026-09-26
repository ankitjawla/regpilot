import { NextResponse } from "next/server";
import { typesafeConfigured, typesafeModel } from "@/lib/typesafe";
import { bigDeployment, smallDeployment } from "@/lib/azure";

/**
 * Lightweight readiness probe for demos and ops.
 * Never returns secret values — only configured/missing + non-secret labels.
 */
export async function GET() {
  const azureKey = Boolean(process.env.AZURE_OPENAI_API_KEY?.trim());
  const azureEndpoint = Boolean(process.env.AZURE_OPENAI_ENDPOINT?.trim());
  const database = Boolean(process.env.DATABASE_URL?.trim());
  const typesafe = typesafeConfigured();

  const ok = azureKey && azureEndpoint && database;
  return NextResponse.json(
    {
      ok,
      services: {
        typesafe: {
          configured: typesafe,
          model: typesafe ? typesafeModel() : null,
          role: "guardrail / triage / confidence (System One)",
        },
        azureOpenAI: {
          configured: azureKey && azureEndpoint,
          deployment: bigDeployment(),
          smallDeployment: smallDeployment(),
          smallUsesPrimary: smallDeployment() === bigDeployment(),
          role: "obligations + memo drafting",
        },
        database: {
          configured: database,
          role: "items / obligations / drafts / audit",
        },
      },
    },
    { status: ok ? 200 : 503 }
  );
}
