import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { typesafeConfigured, typesafeModel } from "@/lib/typesafe";

// Surfaces decision-layer metadata for the dashboard "How Jev works" panel.
export async function GET() {
  const typesafe = {
    configured: typesafeConfigured(),
    model: typesafeModel(),
    endpoint: "https://api.typesafe.ai/v1/systemone",
  };

  try {
    const raw = await readFile(
      path.join(process.cwd(), "jev", "meta.json"),
      "utf-8"
    );
    const local = JSON.parse(raw) as Record<string, unknown>;
    return NextResponse.json({
      primary: typesafe.configured ? "typesafe-system-one" : "jev-local",
      typesafe,
      local,
      version: typesafe.configured
        ? `typesafe:${typesafe.model}`
        : (local.version as string) || "jev-local-v1",
    });
  } catch {
    return NextResponse.json({
      primary: typesafe.configured ? "typesafe-system-one" : "unavailable",
      typesafe,
      local: { version: "jev-local-v1", unavailable: true },
      version: typesafe.configured
        ? `typesafe:${typesafe.model}`
        : "jev-local-v1",
      unavailable: !typesafe.configured,
    });
  }
}
