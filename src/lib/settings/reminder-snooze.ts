import { readPreferenceNumber } from "./intervention-levels";

export const REMINDER_SNOOZE_DAYS_PREF_KEY = "adaptive.reminderSnoozeDays";
export const REMINDER_SNOOZE_UNTIL_PREF_KEY = "adaptive.reminderSuggestionSnoozeUntil";

const DEFAULT_SNOOZE_DAYS = 3;

export function readReminderSnoozeDaysPref(v: unknown): number {
  const n = readPreferenceNumber(v, DEFAULT_SNOOZE_DAYS);
  if (!Number.isFinite(n)) return DEFAULT_SNOOZE_DAYS;
  return Math.min(30, Math.max(1, Math.round(n)));
}

export function readReminderSuggestionSnoozeUntil(v: unknown): Date | null {
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "object" && v !== null && "until" in v) {
    const u = (v as { until?: unknown }).until;
    if (typeof u === "string") {
      const d = new Date(u);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

/** Lokaler Tagesbeginn + `days` volle Kalendertage (für „Erinnerungs-Vorschlag wieder fragen“). */
export function addLocalCalendarDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}
