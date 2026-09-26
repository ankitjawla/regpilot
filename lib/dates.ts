// Typed due-date extraction — TypeSafe date parts → ISO assembly in code.
// See docs.typesafe.ai date_extraction_cookbook.

export const MONTHS: Record<string, number> = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type DateMode = "absolute" | "relative" | "none";

export type DatePartAnswer = {
  choice: string;
  confidence: number;
};

export type DateParts = {
  mode: DatePartAnswer;
  month: DatePartAnswer;
  day: DatePartAnswer;
  year: DatePartAnswer;
  day_anchor: DatePartAnswer;
  weekday: DatePartAnswer;
  week_offset: DatePartAnswer;
};

export type AssembledDate = {
  due_date_iso: string | null;
  date_confidence: number | null;
  needs_review: boolean;
  note: string;
  mode: DateMode | string;
};

function resolveWeekday(
  today: Date,
  weekday: string,
  weekOffset: string
): Date {
  const w = WEEKDAYS.indexOf(weekday as Weekday);
  const todayDow = (today.getDay() + 6) % 7; // Mon=0
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - todayDow);
  const out = new Date(thisMonday);
  if (weekOffset === "next") {
    out.setDate(thisMonday.getDate() + 7 + w);
  } else if (weekOffset === "current") {
    out.setDate(thisMonday.getDate() + w);
  } else {
    // bare weekday = next occurrence on or after today
    const delta = (w - todayDow + 7) % 7;
    out.setTime(today.getTime());
    out.setDate(today.getDate() + delta);
  }
  return out;
}

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Assemble TypeSafe date-part answers into an ISO date + min-part confidence. */
export function assembleDueDate(
  parts: DateParts,
  opts?: { today?: Date; reviewBelow?: number }
): AssembledDate {
  const today = opts?.today ?? new Date();
  const reviewBelow = opts?.reviewBelow ?? 0.6;
  const mode = parts.mode.choice as DateMode;
  const confs: number[] = [parts.mode.confidence];

  const result = (
    resolved: Date | null,
    note: string
  ): AssembledDate => {
    const usable = confs.filter((c) => Number.isFinite(c));
    const confidence = usable.length ? Math.min(...usable) : null;
    const needs_review =
      resolved == null ||
      confidence == null ||
      confidence < reviewBelow;
    return {
      due_date_iso: resolved ? iso(resolved) : null,
      date_confidence: confidence,
      needs_review,
      note,
      mode,
    };
  };

  if (mode === "none") {
    return result(null, "no such date stated");
  }

  if (mode === "absolute") {
    const month = parts.month.choice;
    const day = parts.day.choice;
    const year = parts.year.choice;
    confs.push(
      parts.month.confidence,
      parts.day.confidence,
      parts.year.confidence
    );
    if (month === "none" || day === "none" || !(month in MONTHS) || !/^\d+$/.test(day)) {
      return result(null, "absolute date incomplete");
    }
    if (year === "out_of_range") {
      return result(null, "year outside 1900-2050");
    }
    const monthNum = MONTHS[month];
    const dayNum = Number(day);
    if (year === "none") {
      try {
        let resolved = new Date(today.getFullYear(), monthNum - 1, dayNum);
        if (resolved.getMonth() !== monthNum - 1) {
          return result(null, `impossible date: ${month} ${day}`);
        }
        const cutoff = new Date(today);
        cutoff.setDate(today.getDate() - 31);
        if (resolved < cutoff) {
          resolved = new Date(today.getFullYear() + 1, monthNum - 1, dayNum);
        }
        return result(resolved, "");
      } catch {
        return result(null, `impossible date: ${month} ${day}`);
      }
    }
    try {
      const y = Number(year);
      const resolved = new Date(y, monthNum - 1, dayNum);
      if (resolved.getFullYear() !== y || resolved.getMonth() !== monthNum - 1) {
        return result(null, `impossible date: ${year}-${month}-${day}`);
      }
      return result(resolved, "");
    } catch {
      return result(null, `impossible date: ${year}-${month}-${day}`);
    }
  }

  if (mode === "relative") {
    const anchor = parts.day_anchor.choice;
    confs.push(parts.day_anchor.confidence);
    if (anchor === "today") return result(new Date(today), "");
    if (anchor === "tomorrow") {
      const d = new Date(today);
      d.setDate(today.getDate() + 1);
      return result(d, "");
    }
    if (anchor === "day_after") {
      const d = new Date(today);
      d.setDate(today.getDate() + 2);
      return result(d, "");
    }
    if (anchor === "weekday") {
      const weekday = parts.weekday.choice;
      const offset = parts.week_offset.choice;
      confs.push(parts.weekday.confidence, parts.week_offset.confidence);
      if (!(WEEKDAYS as readonly string[]).includes(weekday)) {
        return result(null, "relative weekday not read");
      }
      return result(resolveWeekday(today, weekday, offset), "");
    }
    return result(null, "relative day not read");
  }

  return result(null, `unrecognized mode: ${mode}`);
}
