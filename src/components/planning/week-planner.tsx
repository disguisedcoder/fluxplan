"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Calendar as CalIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  categoryBadgeClass,
  categoryToneFor,
  pickPrimaryCategory,
} from "@/lib/ui/category";
import type { Task } from "@/components/tasks/types";
import { addDays, startOfLocalDay } from "./date";

const HOUR_HEIGHT = 56; // px per hour
const HOUR_START = 8;
const HOUR_END = 19; // exclusive

export function WeekPlanner() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (res.status === 401) {
        setTasks([]);
        return;
      }
      const data = await res.json();
      setTasks((data.tasks ?? []) as Task[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const tasksByDay = useMemo(() => buildTasksByDay(tasks, days), [tasks, days]);
  const conflicts = useMemo(() => detectConflicts(tasksByDay), [tasksByDay]);
  const unplanned = useMemo(() => tasks.filter((t) => !t.dueDate && t.status !== "done"), [tasks]);

  async function planTaskAt(taskId: string, when: Date) {
    setBusyId(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dueDate: when.toISOString() }),
      });
      if (!res.ok) {
        toast.error("Konnte Aufgabe nicht planen.");
        return;
      }
      toast.success("Aufgabe geplant.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 min-w-0 space-y-4">
          <CalendarHeader
            weekStart={weekStart}
            onChange={setWeekStart}
            conflictCount={conflicts.size}
          />
          <Card className="fp-card overflow-hidden">
            <CardContent className="p-0">
              <WeekGrid
                days={days}
                tasksByDay={tasksByDay}
                conflictIds={conflicts}
                loading={loading}
              />
            </CardContent>
          </Card>

          <PlanningExplainerCard />
        </div>

        <aside className="w-full lg:w-[320px] space-y-4">
          <UnplannedList
            unplanned={unplanned}
            loading={loading}
            busyId={busyId}
            onPlanToday={(taskId) => planTaskAt(taskId, defaultPlanTime(new Date()))}
          />
          {conflicts.size > 0 ? <ConflictCard count={conflicts.size} /> : null}
          <FreeSlotsCard tasksByDay={tasksByDay} weekStart={weekStart} />
        </aside>
      </div>
    </div>
  );
}

function CalendarHeader({
  weekStart,
  onChange,
  conflictCount,
}: {
  weekStart: Date;
  onChange: (d: Date) => void;
  conflictCount: number;
}) {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: sameMonth ? undefined : "short",
    });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="text-sm text-muted-foreground">Kalenderwoche</div>
        <div className="text-lg font-semibold tracking-tight">
          {fmt(weekStart)} – {end.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {conflictCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {conflictCount} Konflikt{conflictCount === 1 ? "" : "e"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-xs text-muted-foreground">
            <CalIcon className="h-3.5 w-3.5" />
            Keine Konflikte
          </span>
        )}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(addDays(weekStart, -7))}
          aria-label="Vorherige Woche"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(mondayOf(new Date()))}
        >
          Diese Woche
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(addDays(weekStart, 7))}
          aria-label="Nächste Woche"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function WeekGrid({
  days,
  tasksByDay,
  conflictIds,
  loading,
}: {
  days: Date[];
  tasksByDay: Map<string, ScheduledTask[]>;
  conflictIds: Set<string>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Lade Termine …</div>
    );
  }
  return (
    <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
      <div />
      {days.map((d) => (
        <DayHeaderCell key={d.toISOString()} d={d} />
      ))}

      <div className="relative" style={{ height: (HOUR_END - HOUR_START) * HOUR_HEIGHT }}>
        {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i).map((h) => (
          <div
            key={h}
            className="absolute right-2 text-[11px] tabular-nums text-muted-foreground"
            style={{ top: (h - HOUR_START) * HOUR_HEIGHT - 6 }}
          >
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>

      {days.map((d) => {
        const key = isoKey(d);
        const items = tasksByDay.get(key) ?? [];
        return (
          <DayColumn key={key} day={d} items={items} conflictIds={conflictIds} />
        );
      })}
    </div>
  );
}

function DayHeaderCell({ d }: { d: Date }) {
  const isToday = isSameDay(d, new Date());
  return (
    <div
      className={cn(
        "border-b border-border/60 px-2 py-2 text-center text-xs",
        isToday && "bg-primary/5",
      )}
    >
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {d.toLocaleDateString(undefined, { weekday: "short" })}
      </div>
      <div className={cn("mt-0.5 text-sm font-semibold tabular-nums", isToday && "text-primary")}>
        {d.getDate()}
      </div>
    </div>
  );
}

function DayColumn({
  day,
  items,
  conflictIds,
}: {
  day: Date;
  items: ScheduledTask[];
  conflictIds: Set<string>;
}) {
  const isToday = isSameDay(day, new Date());
  return (
    <div
      className={cn(
        "relative border-l border-border/40",
        isToday && "bg-primary/[0.04]",
      )}
      style={{ height: (HOUR_END - HOUR_START) * HOUR_HEIGHT }}
    >
      {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i).map((i) => (
        <div
          key={i}
          className={cn("absolute inset-x-0 border-t border-dashed border-border/35")}
          style={{ top: i * HOUR_HEIGHT }}
        />
      ))}

      {items.map((it) => (
        <EventChip key={it.task.id} item={it} conflict={conflictIds.has(it.task.id)} />
      ))}
    </div>
  );
}

type ScheduledTask = {
  task: Task;
  startMinutes: number;
  durationMinutes: number;
};

function EventChip({ item, conflict }: { item: ScheduledTask; conflict: boolean }) {
  const { task, startMinutes, durationMinutes } = item;
  const startHour = startMinutes / 60;
  const top = (startHour - HOUR_START) * HOUR_HEIGHT;
  const height = Math.max(28, (durationMinutes / 60) * HOUR_HEIGHT);
  const category = pickPrimaryCategory(task);
  const tone = categoryToneFor(category);
  const baseClass = categoryBadgeClass(tone);

  return (
    <div
      className={cn(
        "absolute left-1 right-1 overflow-hidden rounded-md border px-2 py-1 text-[11px] leading-tight shadow-sm",
        baseClass,
        conflict && "ring-1 ring-amber-400 ring-offset-1 ring-offset-background",
      )}
      style={{ top, height }}
      title={`${task.title} – ${formatHM(startMinutes)}`}
    >
      <div className="truncate font-medium">{task.title}</div>
      <div className="opacity-80">
        {formatHM(startMinutes)}{conflict ? " · überlappt" : ""}
      </div>
    </div>
  );
}

function UnplannedList({
  unplanned,
  loading,
  busyId,
  onPlanToday,
}: {
  unplanned: Task[];
  loading: boolean;
  busyId: string | null;
  onPlanToday: (id: string) => void;
}) {
  return (
    <Card className="fp-card">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">Ungeplante Aufgaben</h3>
          <span className="text-xs text-muted-foreground">{unplanned.length}</span>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Lade …</div>
        ) : unplanned.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Alles im Kalender. Du siehst hier nur Aufgaben ohne festes Zeitfenster.
          </div>
        ) : (
          <ul className="space-y-2">
            {unplanned.slice(0, 8).map((t) => {
              const cat = pickPrimaryCategory(t);
              const tone = categoryToneFor(cat);
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{t.title}</div>
                    {cat ? (
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-full border px-1.5 py-0 text-[10px] capitalize",
                          categoryBadgeClass(tone),
                        )}
                      >
                        {cat}
                      </span>
                    ) : null}
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={busyId === t.id}
                    onClick={() => onPlanToday(t.id)}
                  >
                    Heute
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Aufgaben werden nur geplant, wenn du es bestätigst. FluxPlan verschiebt nichts automatisch.
        </p>
      </CardContent>
    </Card>
  );
}

function ConflictCard({ count }: { count: number }) {
  return (
    <Card className="fp-card border-amber-200/60 bg-amber-50/40">
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          Konflikte erkannt
        </div>
        <p className="text-sm text-amber-900/80">
          {count} überlappende Zeitfenster wurden markiert (orangener Rahmen). FluxPlan
          räumt nicht automatisch auf – du entscheidest, was bleibt oder verschoben wird.
        </p>
      </CardContent>
    </Card>
  );
}

function FreeSlotsCard({
  tasksByDay,
  weekStart,
}: {
  tasksByDay: Map<string, ScheduledTask[]>;
  weekStart: Date;
}) {
  const today = isoKey(new Date());
  const items = tasksByDay.get(today) ?? tasksByDay.get(isoKey(weekStart)) ?? [];
  const freeSlots = computeFreeSlots(items);
  return (
    <Card className="fp-card">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-semibold tracking-tight">Freie Slots heute</h3>
        {freeSlots.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Heute keine freien Fenster zwischen {HOUR_START}:00 und {HOUR_END}:00.
          </div>
        ) : (
          <ul className="space-y-1.5 text-sm tabular-nums">
            {freeSlots.slice(0, 5).map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-md border border-dashed border-border/60 bg-card px-3 py-1.5"
              >
                <span>
                  {formatHM(s.start)} – {formatHM(s.end)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round((s.end - s.start) / 60 * 10) / 10} h
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PlanningExplainerCard() {
  return (
    <Card className="fp-card-soft">
      <CardContent className="space-y-2 p-5">
        <div className="text-sm font-semibold tracking-tight">Planungslogik</div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>· Aufgaben ohne Datum bleiben links unsichtbar im Grid und sichtbar in der Liste rechts.</li>
          <li>· Überlappende Termine werden orange markiert, aber nicht verschoben.</li>
          <li>· Vorschläge der Anpassungen erscheinen separat und reversibel.</li>
        </ul>
      </CardContent>
    </Card>
  );
}

function buildTasksByDay(tasks: Task[], days: Date[]) {
  const map = new Map<string, ScheduledTask[]>();
  for (const d of days) map.set(isoKey(d), []);
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const start = new Date(t.dueDate);
    const key = isoKey(start);
    if (!map.has(key)) continue;
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    if (startMinutes < HOUR_START * 60 || startMinutes >= HOUR_END * 60) continue;
    const dur = t.estimatedMinutes ?? 45;
    map.get(key)!.push({ task: t, startMinutes, durationMinutes: dur });
  }
  for (const v of map.values()) v.sort((a, b) => a.startMinutes - b.startMinutes);
  return map;
}

function detectConflicts(map: Map<string, ScheduledTask[]>): Set<string> {
  const conflicts = new Set<string>();
  for (const list of map.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const ae = a.startMinutes + a.durationMinutes;
        const be = b.startMinutes + b.durationMinutes;
        if (a.startMinutes < be && b.startMinutes < ae) {
          conflicts.add(a.task.id);
          conflicts.add(b.task.id);
        }
      }
    }
  }
  return conflicts;
}

function computeFreeSlots(items: ScheduledTask[]) {
  const startMin = HOUR_START * 60;
  const endMin = HOUR_END * 60;
  const occupied = items
    .map((i) => ({ s: i.startMinutes, e: i.startMinutes + i.durationMinutes }))
    .sort((a, b) => a.s - b.s);
  const merged: { s: number; e: number }[] = [];
  for (const o of occupied) {
    const last = merged[merged.length - 1];
    if (last && o.s <= last.e) {
      last.e = Math.max(last.e, o.e);
    } else {
      merged.push({ ...o });
    }
  }
  const slots: { start: number; end: number }[] = [];
  let cursor = startMin;
  for (const m of merged) {
    if (m.s > cursor) slots.push({ start: cursor, end: Math.min(m.s, endMin) });
    cursor = Math.max(cursor, m.e);
  }
  if (cursor < endMin) slots.push({ start: cursor, end: endMin });
  return slots.filter((s) => s.end - s.start >= 30);
}

function defaultPlanTime(day: Date) {
  const d = startOfLocalDay(day);
  d.setHours(10, 0, 0, 0);
  return d;
}

function mondayOf(d: Date) {
  const x = startOfLocalDay(d);
  const day = x.getDay() || 7; // Sunday = 7
  x.setDate(x.getDate() - (day - 1));
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isoKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatHM(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
