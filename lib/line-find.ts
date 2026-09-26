// Semantic line-find helpers — tag source lines and map TypeSafe scores to dispositions.
// Cookbook: https://docs.typesafe.ai/cookbooks/semantic_find.md

export type FindDisposition = "answered" | "partial" | "absent";

export type TaggedLine = {
  id: string;
  index: number;
  text: string;
};

export type LineHit = {
  id: string;
  index: number;
  text: string;
  relevance: number;
};

/** Presence thresholds from the semantic-find cookbook (tune per domain). */
export const FIND_FOUND = 0.7;
export const FIND_ABSENT = 0.35;

/** Choice accepts up to 255 options; leave headroom for safety. */
export const FIND_MAX_CHOICE_OPTIONS = 250;

export function lineId(index: number): string {
  return `L${String(index).padStart(3, "0")}`;
}

/** Split redacted source into numbered line chunks. */
export function tagSourceLines(source: string): TaggedLine[] {
  const raw = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = raw.length === 0 ? [""] : raw.split("\n");
  return parts.map((text, index) => ({
    id: lineId(index),
    index,
    text,
  }));
}

/** Document state for System One: `L000| …` per line. */
export function taggedDocument(lines: TaggedLine[]): string {
  return lines.map((l) => `${l.id}| ${l.text}`).join("\n");
}

export function findDisposition(existsNoul: number): FindDisposition {
  if (existsNoul >= FIND_FOUND) return "answered";
  if (existsNoul < FIND_ABSENT) return "absent";
  return "partial";
}

export function dispositionLabel(d: FindDisposition): string {
  switch (d) {
    case "answered":
      return "answered in this document";
    case "partial":
      return "partially addressed";
    case "absent":
      return "not in this document";
    default: {
      const _exhaustive: never = d;
      return _exhaustive;
    }
  }
}

/** Rank lines by Choice probabilities; keep top-k with non-trivial mass. */
export function rankLineHits(
  lines: TaggedLine[],
  relevance: number[],
  topK = 4
): LineHit[] {
  const ranked = lines
    .map((l, i) => ({
      id: l.id,
      index: l.index,
      text: l.text,
      relevance: relevance[i] ?? 0,
    }))
    .sort((a, b) => b.relevance - a.relevance);
  return ranked.slice(0, Math.max(1, topK));
}

/**
 * When a document has more lines than Choice allows, search non-overlapping
 * windows first, then rank lines inside the winning window.
 */
export function windowRanges(
  lineCount: number,
  windowSize = 50
): { start: number; end: number; id: string }[] {
  const size = Math.max(10, Math.min(FIND_MAX_CHOICE_OPTIONS, windowSize));
  const out: { start: number; end: number; id: string }[] = [];
  for (let start = 0; start < lineCount; start += size) {
    const end = Math.min(lineCount, start + size);
    out.push({
      start,
      end,
      id: `W${String(out.length).padStart(3, "0")}`,
    });
    if (out.length >= FIND_MAX_CHOICE_OPTIONS) break;
  }
  return out;
}
