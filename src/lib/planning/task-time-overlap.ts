/**
 * Wochenraster: `estimatedMinutes` sonst 45 Min. (unverändert in `week-planner.tsx`).
 * Erstellungs-Hinweis: siehe `OVERLAP_HINT_FALLBACK_MINUTES` + `inferOverlapHintDurationMinutes`.
 */
export const WEEK_PLANNER_SLOT_FALLBACK_MINUTES = 45;

/** Wenn aus vorhandenen Aufgaben keine Dauer ableitbar ist (Erstellungs-Warnung). */
export const OVERLAP_HINT_FALLBACK_MINUTES = 60;

/** @deprecated Verwende `WEEK_PLANNER_SLOT_FALLBACK_MINUTES`. */
export const SLOT_FALLBACK_MINUTES = WEEK_PLANNER_SLOT_FALLBACK_MINUTES;

export type OverlapTaskLike = {
  id: string;
  title: string;
  dueDate: string | Date | null;
  estimatedMinutes?: number | null;
  createdAt?: string;
};

export function minutesSinceLocalMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function taskWindowMinutes(
  due: Date,
  estimatedMinutes: number | null | undefined,
  fallbackMinutes: number = WEEK_PLANNER_SLOT_FALLBACK_MINUTES,
): {
  start: number;
  end: number;
} {
  const start = minutesSinceLocalMidnight(due);
  const dur =
    estimatedMinutes != null && Number.isFinite(estimatedMinutes) && estimatedMinutes > 0
      ? estimatedMinutes
      : fallbackMinutes;
  return { start, end: start + dur };
}

/**
 * Für die Überlappungs-Warnung beim Erstellen:
 * 1) Dauer der **zuletzt erstellten** Aufgabe (neuestes `createdAt`), wenn dort `estimatedMinutes` gesetzt ist.
 * 2) sonst **häufigster** `estimatedMinutes`-Wert unter allen Aufgaben mit Dauer.
 * 3) sonst {@link OVERLAP_HINT_FALLBACK_MINUTES}.
 */
export function inferOverlapHintDurationMinutes(
  tasks: { estimatedMinutes: number | null; createdAt: string }[],
): number {
  if (tasks.length === 0) return OVERLAP_HINT_FALLBACK_MINUTES;

  const sorted = [...tasks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const newest = sorted[0];
  if (
    newest.estimatedMinutes != null &&
    Number.isFinite(newest.estimatedMinutes) &&
    newest.estimatedMinutes > 0
  ) {
    return newest.estimatedMinutes;
  }

  const withDur = sorted.filter((t) => {
    const m = t.estimatedMinutes;
    return m != null && Number.isFinite(m) && m > 0;
  });
  if (withDur.length === 0) return OVERLAP_HINT_FALLBACK_MINUTES;

  const counts = new Map<number, number>();
  for (const t of withDur) {
    const m = t.estimatedMinutes as number;
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  let bestM = OVERLAP_HINT_FALLBACK_MINUTES;
  let bestC = -1;
  for (const [m, c] of counts) {
    if (c > bestC || (c === bestC && m > bestM)) {
      bestC = c;
      bestM = m;
    }
  }
  return bestM;
}

export function intervalsOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && b.start < a.end;
}

export function sameLocalCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Liefert Titel fremder Aufgaben, deren Zeitfenster sich mit dem Entwurf überschneiden (lokale Tagesgrenze).
 * `inferredFallbackMinutes`: für fehlende Dauer beim Entwurf und bei anderen Tasks (siehe `inferOverlapHintDurationMinutes`).
 */
export function overlappingOpenTasksForDraft(
  draftDue: Date,
  draftEstimatedMinutes: number | null | undefined,
  others: OverlapTaskLike[],
  excludeTaskId: string | undefined,
  inferredFallbackMinutes: number,
): string[] {
  const draftWin = taskWindowMinutes(draftDue, draftEstimatedMinutes, inferredFallbackMinutes);
  const titles: string[] = [];
  for (const t of others) {
    if (!t.dueDate) continue;
    if (excludeTaskId && t.id === excludeTaskId) continue;
    const od = typeof t.dueDate === "string" ? new Date(t.dueDate) : t.dueDate;
    if (isNaN(od.getTime())) continue;
    if (!sameLocalCalendarDay(draftDue, od)) continue;
    const ow = taskWindowMinutes(od, t.estimatedMinutes, inferredFallbackMinutes);
    if (intervalsOverlap(draftWin, ow)) titles.push(t.title);
  }
  return titles;
}
