import { readPreferenceBool } from "./intervention-levels";

/** Präferenz `taskFormOptionalFold`: Zusatzfelder (Chips) im Formular zunächst eingeklappt. */
export function readTaskFormOptionalFold(v: unknown): boolean {
  if (v && typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    if (typeof o.enabled === "boolean") return o.enabled;
  }
  return readPreferenceBool(v, false);
}
