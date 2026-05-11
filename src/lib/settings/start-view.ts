/**
 * User preference `startView` — where /start and post-welcome flows should land.
 */

export const DEFAULT_START_HREF = "/heute";

const ALLOWED = new Set([
  "/heute",
  "/today",
  "/kalender",
  "/planning",
  "/aufgaben",
  "/tasks",
  "/erstellen",
]);

export function normalizeStartViewHref(raw: string): string {
  const s = raw.trim();
  if (!s.startsWith("/")) return DEFAULT_START_HREF;
  if (ALLOWED.has(s)) return s;
  return DEFAULT_START_HREF;
}

function readHrefFromJsonValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && "href" in (value as Record<string, unknown>)) {
    const h = (value as { href?: unknown }).href;
    if (typeof h === "string" && h.startsWith("/")) return h;
  }
  if (typeof value === "object" && value !== null && "value" in value) {
    return readHrefFromJsonValue((value as { value?: unknown }).value);
  }
  return null;
}

/** Nur explizit gespeicherte Startansicht; ohne Eintrag → `null` (→ `/willkommen` über `/start`). */
export function getSavedStartViewHref(prefs: Record<string, unknown>): string | null {
  return readHrefFromJsonValue(prefs["startView"]);
}

export function resolveStartViewFromPreferences(prefs: Record<string, unknown>): string {
  const raw = getSavedStartViewHref(prefs);
  return normalizeStartViewHref(raw ?? DEFAULT_START_HREF);
}

/** Kurztext für UI („Startansicht: …“). */
export function labelForStartHref(href: string): string {
  const h = normalizeStartViewHref(href);
  switch (h) {
    case "/kalender":
      return "Kalender";
    case "/planning":
      return "Planung";
    case "/aufgaben":
    case "/tasks":
      return "Aufgaben";
    case "/erstellen":
      return "Erstellen";
    case "/today":
      return "Heute (EN)";
    case "/heute":
    default:
      return "Heute";
  }
}
