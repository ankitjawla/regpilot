import { NextResponse } from "next/server";
import { SAMPLE_FRAMEWORKS, SAMPLES } from "@/lib/samples";

export async function GET() {
  return NextResponse.json({
    frameworks: SAMPLE_FRAMEWORKS,
    samples: SAMPLES.map((s) => ({
      id: s.id,
      title: s.title,
      label: s.label,
      framework: s.framework,
      preview: s.text.slice(0, 160).replace(/\s+/g, " ") + "…",
      text: s.text,
    })),
  });
}
