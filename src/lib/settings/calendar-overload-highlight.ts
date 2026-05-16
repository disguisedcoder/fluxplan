/** Nach Annahme des Planungskonflikt-Hinweises: überlastete Tage im Kalender mit Badge markieren. */
export const CALENDAR_OVERLOAD_HIGHLIGHT_PREF_KEY = "adaptive.calendarOverloadHighlight";

export function readCalendarOverloadHighlightPref(value: unknown): boolean {
  if (value && typeof value === "object" && value !== null && "enabled" in value) {
    return Boolean((value as { enabled?: unknown }).enabled);
  }
  return false;
}
