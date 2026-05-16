/** Gleiche Schwelle wie `calendarConflictRule` (Summe offener Aufgaben pro Kalendertag). */
export const CALENDAR_DAY_OVERLOAD_THRESHOLD_MINUTES = 8 * 60;

export function planningDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type TaskLike = {
  dueDate: string | Date | null;
  estimatedMinutes: number | null;
  status?: string;
};

/** Summe `estimatedMinutes` aller offenen Aufgaben mit Fälligkeit an diesem Kalendertag (fehlende Dauer = 0). */
export function buildEstimatedMinutesByDayKey(tasks: TaskLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of tasks) {
    if (!t.dueDate || t.status === "done") continue;
    const d = new Date(t.dueDate);
    const key = planningDayKey(d);
    map.set(key, (map.get(key) ?? 0) + (t.estimatedMinutes ?? 0));
  }
  return map;
}

/** Wie `buildTasksByDay` im Kalender: fehlende Dauer = 45 Min. — für sichtbare Badges nach Annahme. */
export function buildDisplayEstimatedMinutesByDayKey(tasks: TaskLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of tasks) {
    if (!t.dueDate || t.status === "done") continue;
    const d = new Date(t.dueDate);
    const key = planningDayKey(d);
    const mins =
      t.estimatedMinutes != null && Number.isFinite(t.estimatedMinutes) && t.estimatedMinutes > 0
        ? t.estimatedMinutes
        : 45;
    map.set(key, (map.get(key) ?? 0) + mins);
  }
  return map;
}

export function isCalendarDayOverloaded(totalMinutes: number): boolean {
  return totalMinutes >= CALENDAR_DAY_OVERLOAD_THRESHOLD_MINUTES;
}

/** Badge-Label für Kalenderzellen, z. B. „≈9h“. */
export function formatDayOverloadBadge(totalMinutes: number): string | null {
  if (!isCalendarDayOverloaded(totalMinutes)) return null;
  const hours = Math.round(totalMinutes / 60);
  return `≈${hours}h`;
}

export function dayOverloadBadgeTitle(totalMinutes: number): string {
  const h = Math.round((totalMinutes / 60) * 10) / 10;
  return `Geschätzte Auslastung an diesem Tag: ca. ${h} Stunden (ab 8 h als stark verplant markiert).`;
}
