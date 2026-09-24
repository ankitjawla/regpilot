import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

// Surfaces the local Jev model's training metadata (accuracies, sizes) for the
// dashboard's "How Jev works" panel. Static JSON written by jev/train.py.
export async function GET() {
  try {
    const raw = await readFile(path.join(process.cwd(), "jev", "meta.json"), "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(
      { version: "jev-local-v1", unavailable: true },
      { status: 200 }
    );
  }
}
