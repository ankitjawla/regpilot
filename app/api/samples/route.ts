import { NextRequest, NextResponse } from "next/server";
import { SAMPLE_FRAMEWORKS, SAMPLES } from "@/lib/samples";
import { query, audit } from "@/lib/db";
import { rateLimited, clientIp } from "@/lib/ratelimit";

type CustomRow = {
  id: number;
  title: string;
  framework: string;
  label: string;
  text: string;
};

export async function GET() {
  let custom: CustomRow[] = [];
  try {
    custom = await query<CustomRow>(
      `SELECT id, title, framework, label, text FROM regpilot_custom_samples ORDER BY created_at DESC LIMIT 50`
    );
  } catch {
    custom = [];
  }

  const builtIn = SAMPLES.map((s) => ({
    id: s.id,
    title: s.title,
    label: s.label,
    framework: s.framework,
    preview: s.text.slice(0, 160).replace(/\s+/g, " ") + "…",
    text: s.text,
    source: "builtin" as const,
  }));

  const customMapped = custom.map((s) => ({
    id: `custom-${s.id}`,
    title: s.title,
    label: s.label,
    framework: s.framework,
    preview: s.text.slice(0, 160).replace(/\s+/g, " ") + "…",
    text: s.text,
    source: "custom" as const,
    dbId: s.id,
  }));

  const frameworks = Array.from(
    new Set([
      ...SAMPLE_FRAMEWORKS,
      ...customMapped.map((c) => c.framework),
    ])
  );

  return NextResponse.json({
    frameworks,
    samples: [...customMapped, ...builtIn],
  });
}

export async function POST(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  try {
    const body = (await req.json()) as {
      title?: string;
      framework?: string;
      text?: string;
    };
    if (typeof body.text !== "string" || body.text.trim().length < 40) {
      return NextResponse.json(
        { error: "Sample text must be at least 40 characters." },
        { status: 400 }
      );
    }
    if (body.text.length > 30000) {
      return NextResponse.json({ error: "Text too long" }, { status: 400 });
    }
    const title =
      (typeof body.title === "string" && body.title.trim().slice(0, 120)) ||
      body.text.trim().replace(/\s+/g, " ").slice(0, 80);
    const framework =
      (typeof body.framework === "string" &&
        body.framework.trim().slice(0, 40)) ||
      "Custom";

    const rows = await query<{ id: number }>(
      `INSERT INTO regpilot_custom_samples(title, framework, label, text)
       VALUES ($1,$2,'CUSTOM SAMPLE',$3) RETURNING id`,
      [title, framework, body.text.trim()]
    );
    await audit(null, "human", "samples.create", `id=${rows[0].id} ${title}`);
    return NextResponse.json({
      ok: true,
      id: `custom-${rows[0].id}`,
      dbId: rows[0].id,
    });
  } catch (e) {
    console.error("[samples POST]", (e as Error).message);
    return NextResponse.json(
      { error: "Failed to save sample" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  try {
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await query(`DELETE FROM regpilot_custom_samples WHERE id=$1`, [id]);
    await audit(null, "human", "samples.delete", `id=${id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[samples DELETE]", (e as Error).message);
    return NextResponse.json(
      { error: "Failed to delete sample" },
      { status: 500 }
    );
  }
}
