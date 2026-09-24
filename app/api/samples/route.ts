import { NextResponse } from "next/server";
import { SAMPLES } from "@/lib/samples";

export async function GET() {
  return NextResponse.json({
    samples: SAMPLES.map((s) => ({
      id: s.id,
      title: s.title,
      label: s.label,
      preview: s.text.slice(0, 160).replace(/\s+/g, " ") + "…",
      text: s.text,
    })),
  });
}
