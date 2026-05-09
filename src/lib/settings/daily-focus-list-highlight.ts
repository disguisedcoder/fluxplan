/** Nach Annahme des Fokus-Hinweises: überfällige + heute fällige Zeilen in der To-Do-Liste auf „Heute“ rot hervorheben. */
export const DAILY_FOCUS_LIST_HIGHLIGHT_PREF_KEY = "adaptive.dailyFocusListHighlight";

export function readDailyFocusListHighlightPref(value: unknown): boolean {
  if (value && typeof value === "object" && value !== null && "enabled" in value) {
    return Boolean((value as { enabled?: unknown }).enabled);
  }
  return false;
}
