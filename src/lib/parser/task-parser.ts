// Deterministischer, transparenter Parser für natürlichsprachliche Aufgabentitel.
// Erkennt: "heute", "morgen", "übermorgen", Wochentage,
//   konkrete Daten ("am 12.", "12.5.", "12.05.2026"),
//   Uhrzeiten ("um 14", "14:30", "8 uhr"),
//   Liste/Kategorie ("für Studium", "in #Research"),
//   Tags ("#literatur"),
//   Priorität ("!high", "!hoch", "!mittel", "!niedrig"),
//   Schätzdauer ("90 min", "1h", "1,5 std").
// Gibt geparste Felder + zugehörige Token-Spans zurück, damit das UI Chips zeigen kann.

export type ParsedTask = {
  title: string;
  rawInput: string;
  dueDate: string | null;
  dueTimeMinutes: number | null;
  listName: string | null;
  tags: string[];
  priority: "low" | "medium" | "high" | null;
  estimatedMinutes: number | null;
  tokens: ParsedToken[];
};

export type ParsedToken = {
  kind: "date" | "time" | "list" | "tag" | "priority" | "duration";
  raw: string;
  value: string;
};

const WEEKDAYS: { keys: string[]; index: number }[] = [
  { keys: ["mo", "mon", "montag"], index: 1 },
  { keys: ["di", "die", "dienstag"], index: 2 },
  { keys: ["mi", "mit", "mittwoch"], index: 3 },
  { keys: ["do", "don", "donnerstag"], index: 4 },
  { keys: ["fr", "fre", "freitag"], index: 5 },
  { keys: ["sa", "sam", "samstag"], index: 6 },
  { keys: ["so", "son", "sonntag"], index: 0 },
];

const PRIORITY_MAP: Record<string, ParsedTask["priority"]> = {
  hoch: "high",
  high: "high",
  wichtig: "high",
  mittel: "medium",
  medium: "medium",
  normal: "medium",
  niedrig: "low",
  low: "low",
  optional: "low",
};

export function parseTask(input: string, now: Date = new Date()): ParsedTask {
  const tokens: ParsedToken[] = [];
  let working = " " + input + " ";
  let dueDate: Date | null = null;
  let dueTimeMinutes: number | null = null;
  let listName: string | null = null;
  const tags: string[] = [];
  let priority: ParsedTask["priority"] = null;
  let estimatedMinutes: number | null = null;

  // 1. priority: !hoch / !low / !mittel / !niedrig / !high
  working = working.replace(/\s!([a-zäöüß]+)/gi, (m, word) => {
    const k = String(word).toLowerCase();
    if (PRIORITY_MAP[k]) {
      priority = PRIORITY_MAP[k];
      tokens.push({ kind: "priority", raw: m.trim(), value: priority ?? "" });
      return " ";
    }
    return m;
  });

  // 2. tags: #foo
  working = working.replace(/\s#([\p{L}0-9_-]+)/giu, (m, t) => {
    const v = String(t).toLowerCase();
    tags.push(v);
    tokens.push({ kind: "tag", raw: m.trim(), value: v });
    return " ";
  });

  // 3. list: "für Studium" / "in Studium"
  working = working.replace(
    /\s(für|fuer|in)\s+([A-ZÄÖÜ][\p{L}0-9 _-]{1,32})\b/giu,
    (m, _kw, name) => {
      if (!listName) {
        listName = String(name).trim();
        tokens.push({ kind: "list", raw: m.trim(), value: listName });
        return " ";
      }
      return m;
    },
  );

  // 4. duration: "90 min", "1h", "1,5 std", "30 minuten"
  working = working.replace(
    /\s(\d+(?:[.,]\d+)?)\s*(min|minuten|h|std|stunden?)\b/gi,
    (m, num, unit) => {
      const n = Number(String(num).replace(",", "."));
      if (Number.isFinite(n)) {
        const u = String(unit).toLowerCase();
        const minutes = u.startsWith("h") || u.startsWith("std") ? Math.round(n * 60) : Math.round(n);
        if (minutes > 0 && minutes <= 24 * 60) {
          estimatedMinutes = minutes;
          tokens.push({ kind: "duration", raw: m.trim(), value: `${minutes} min` });
          return " ";
        }
      }
      return m;
    },
  );

  // 5. time: "um 14", "14:30", "8 uhr", "8:00"
  working = working.replace(
    /\s(?:um\s+)?(\d{1,2})(?::(\d{2}))?(?:\s*uhr)?\b/gi,
    (m, hh, mm) => {
      // we only consume if string clearly looked like a time:
      // either followed by "uhr", or "um X", or "HH:MM" form
      const hhNum = Number(hh);
      const mmNum = mm ? Number(mm) : 0;
      const looksLikeTime =
        /\suhr/i.test(m) || /\sum\s/i.test(m) || /:\d{2}/.test(m);
      if (!looksLikeTime) return m;
      if (hhNum >= 0 && hhNum < 24 && mmNum >= 0 && mmNum < 60) {
        dueTimeMinutes = hhNum * 60 + mmNum;
        tokens.push({
          kind: "time",
          raw: m.trim(),
          value: `${String(hhNum).padStart(2, "0")}:${String(mmNum).padStart(2, "0")}`,
        });
        return " ";
      }
      return m;
    },
  );

  // 6. relative dates
  const replacedRel = (label: string, daysAhead: number, raw: string) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysAhead);
    dueDate = d;
    tokens.push({ kind: "date", raw, value: label });
  };

  if (/\bheute\b/i.test(working)) {
    replacedRel("heute", 0, "heute");
    working = working.replace(/\bheute\b/gi, " ");
  } else if (/\bmorgen\b/i.test(working)) {
    replacedRel("morgen", 1, "morgen");
    working = working.replace(/\bmorgen\b/gi, " ");
  } else if (/\b(uebermorgen|übermorgen)\b/i.test(working)) {
    replacedRel("übermorgen", 2, "übermorgen");
    working = working.replace(/\b(uebermorgen|übermorgen)\b/gi, " ");
  }

  // 7. weekday: "Montag", "Mo"
  if (!dueDate) {
    const lower = working.toLowerCase();
    for (const w of WEEKDAYS) {
      const re = new RegExp(`\\b(${w.keys.join("|")})\\b`, "i");
      const match = re.exec(lower);
      if (match) {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const cur = start.getDay();
        let diff = (w.index - cur + 7) % 7;
        if (diff === 0) diff = 7;
        start.setDate(start.getDate() + diff);
        dueDate = start;
        tokens.push({ kind: "date", raw: match[0], value: w.keys[w.keys.length - 1] });
        working = working.replace(re, " ");
        break;
      }
    }
  }

  // 8. concrete date: "12.5.", "12.05.2026", "am 12."
  if (!dueDate) {
    const dm = /\b(?:am\s+)?(\d{1,2})\.\s*(\d{1,2})?\.?\s*(\d{2,4})?\b/i.exec(working);
    if (dm) {
      const day = Number(dm[1]);
      const month = dm[2] ? Number(dm[2]) - 1 : now.getMonth();
      let year = dm[3] ? Number(dm[3]) : now.getFullYear();
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        dueDate = d;
        tokens.push({
          kind: "date",
          raw: dm[0],
          value: d.toLocaleDateString(),
        });
        working = working.replace(dm[0], " ");
      }
    }
  }

  let finalDue: Date | null = null;
  if (dueDate) {
    finalDue = new Date(dueDate);
    if (dueTimeMinutes !== null) {
      finalDue.setHours(Math.floor(dueTimeMinutes / 60), dueTimeMinutes % 60, 0, 0);
    } else {
      finalDue.setHours(0, 0, 0, 0);
    }
  } else if (dueTimeMinutes !== null) {
    finalDue = new Date(now);
    finalDue.setHours(Math.floor(dueTimeMinutes / 60), dueTimeMinutes % 60, 0, 0);
    if (finalDue.getTime() < now.getTime()) {
      finalDue.setDate(finalDue.getDate() + 1);
    }
  }

  const title = working.replace(/\s+/g, " ").trim();

  return {
    title: title || input.trim(),
    rawInput: input,
    dueDate: finalDue ? finalDue.toISOString() : null,
    dueTimeMinutes,
    listName,
    tags,
    priority,
    estimatedMinutes,
    tokens,
  };
}
