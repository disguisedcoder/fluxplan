/**
 * UI copy + helpers for adaptive.interventionLevel (0–3).
 * Engine thresholds stay in engineConfig; labels stay study-facing here.
 */
export const INTERVENTION_LEVELS = [
  {
    value: 0,
    label: "Aus",
    desc: "Keine neuen Vorschläge durch die Heuristiken (Regeln werden nicht ausgelöst).",
  },
  {
    value: 1,
    label: "Leicht",
    desc: "Nur bei sehr klaren Mustern (strengere Schwellen).",
  },
  {
    value: 2,
    label: "Mittel",
    desc: "Ausgewogene Standard-Sensitivität für die Evaluation.",
  },
  {
    value: 3,
    label: "Viel",
    desc: "Eher früh und häufiger Vorschläge bei erkennbaren Mustern, weiterhin erklärbar.",
  },
] as const;

export type InterventionLevel = (typeof INTERVENTION_LEVELS)[number]["value"];

export function clampInterventionLevel(raw: number): InterventionLevel {
  if (!Number.isFinite(raw)) return 2;
  const rounded = Math.round(raw);
  if (rounded <= 0) return 0;
  if (rounded >= 3) return 3;
  return rounded as InterventionLevel;
}

/** Reads a numeric user preference (unwraps `{ value: n }` from Prisma JSON). */
export function readPreferenceNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof v === "object" && v !== null && "value" in v) {
    return readPreferenceNumber((v as { value?: unknown }).value, fallback);
  }
  return fallback;
}

export function readPreferenceBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "object" && v !== null && "value" in v) {
    const inner = (v as { value?: unknown }).value;
    if (typeof inner === "boolean") return inner;
    if (inner === "true" || inner === "false") return inner === "true";
  }
  return fallback;
}

export function readInterventionLevel(pref: unknown, fallback = 2): InterventionLevel {
  return clampInterventionLevel(readPreferenceNumber(pref, fallback));
}
