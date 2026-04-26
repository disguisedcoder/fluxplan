"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { QuickAddInput } from "@/components/tasks/quick-add-input";
import { MiniMonthCalendar } from "./mini-month-calendar";
import type { Task } from "@/components/tasks/types";
import { cn } from "@/lib/utils";
import {
  categoryBadgeClass,
  categoryToneFor,
  pickPrimaryCategory,
} from "@/lib/ui/category";
import { isSameLocalDay, startOfLocalDay } from "./date";

type TaskWithDue = Task & { dueAt?: Date };

export function TodayDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?status=open", { cache: "no-store" });
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetch("/api/adaptive/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen: "/heute" }),
    }).catch(() => {});
  }, [load]);

  const { focus, agenda, dueTodayCount, openCount, highlightedDates } = useMemo(
    () => deriveTodayBuckets(tasks),
    [tasks],
  );

  return (
    <div>
      <PageHeader
        title="Heute"
        subtitle="Ruhige Übersicht für Aufgaben und Termine."
        right={
          <Link href="/erstellen" className={buttonVariants()}>
            Neue Aufgabe
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr_1fr]">
        <FocusListCard
          tasks={focus}
          loading={loading}
          onChanged={load}
        />

        <div className="space-y-6">
          <AgendaCard agenda={agenda} loading={loading} />
          <QuietHintsCard />
        </div>

        <div className="space-y-6">
          <WeekGlanceCard
            highlightedDates={highlightedDates}
            openCount={openCount}
            dueTodayCount={dueTodayCount}
          />
          <SystemStatusCard />
        </div>
      </div>
    </div>
  );
}

function FocusListCard({
  tasks,
  loading,
  onChanged,
}: {
  tasks: TaskWithDue[];
  loading: boolean;
  onChanged: () => void;
}) {
  return (
    <Card className="fp-card">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Fokusliste</h2>
          <Link
            href="/aufgaben"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Alle Aufgaben
          </Link>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Lade …</div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
            Heute ist nichts fällig. Du kannst trotzdem fokussiert arbeiten.
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.slice(0, 5).map((t) => (
              <FocusListItem key={t.id} task={t} onChanged={onChanged} />
            ))}
          </ul>
        )}

        <div className="pt-1">
          <QuickAddInput onCreated={onChanged} />
        </div>
      </CardContent>
    </Card>
  );
}

function FocusListItem({
  task,
  onChanged,
}: {
  task: TaskWithDue;
  onChanged: () => void;
}) {
  const category = pickPrimaryCategory(task);
  const tone = categoryToneFor(category);
  const meta = (() => {
    if (task.dueAt) {
      return `Heute · ${task.dueAt.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
    return task.listName ?? "ohne Zeitblock";
  })();

  async function toggleDone(next: boolean) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next ? "done" : "open" }),
    });
    onChanged();
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
      <Checkbox
        checked={task.status === "done"}
        onCheckedChange={(v) => toggleDone(Boolean(v))}
        aria-label={`Aufgabe ${task.title} erledigen`}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{task.title}</div>
        <div className="truncate text-xs text-muted-foreground">{meta}</div>
      </div>
      {category ? (
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
            categoryBadgeClass(tone),
          )}
        >
          {category}
        </span>
      ) : null}
    </li>
  );
}

function AgendaCard({
  agenda,
  loading,
}: {
  agenda: Array<{ time: string; title: string; tone: string }>;
  loading: boolean;
}) {
  return (
    <Card className="fp-card">
      <CardContent className="space-y-3 p-6">
        <h3 className="text-sm font-semibold tracking-tight">Heute im Blick</h3>
        {loading ? (
          <div className="text-sm text-muted-foreground">Lade …</div>
        ) : agenda.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Keine festen Zeitfenster heute.
          </div>
        ) : (
          <ul className="space-y-2.5">
            {agenda.map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-12 shrink-0 text-muted-foreground tabular-nums">
                  {item.time}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs",
                    item.tone,
                  )}
                >
                  {item.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function QuietHintsCard() {
  return (
    <Card className="fp-card">
      <CardContent className="space-y-3 p-6">
        <h3 className="text-sm font-semibold tracking-tight">Schnellzugriff</h3>
        <p className="text-sm text-muted-foreground">
          Tastenkürzel sind optional und können jederzeit ignoriert werden.
        </p>
        <ul className="space-y-1.5 text-sm">
          <ShortcutRow keyLabel="h" description="Heute öffnen" />
          <ShortcutRow keyLabel="a" description="Aufgabenliste" />
          <ShortcutRow keyLabel="k" description="Kalender" />
          <ShortcutRow keyLabel="n" description="Neue Aufgabe" />
          <ShortcutRow keyLabel="e" description="Einstellungen" />
        </ul>
      </CardContent>
    </Card>
  );
}

function ShortcutRow({
  keyLabel,
  description,
}: {
  keyLabel: string;
  description: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{description}</span>
      <kbd className="rounded border border-border/70 bg-muted px-1.5 py-0.5 font-mono text-[11px] uppercase">
        {keyLabel}
      </kbd>
    </li>
  );
}

function WeekGlanceCard({
  highlightedDates,
  openCount,
  dueTodayCount,
}: {
  highlightedDates: Date[];
  openCount: number;
  dueTodayCount: number;
}) {
  return (
    <Card className="fp-card">
      <CardContent className="space-y-4 p-6">
        <h3 className="text-sm font-semibold tracking-tight">Woche im Blick</h3>
        <MiniMonthCalendar highlightedDates={highlightedDates} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-sm">
          <div className="text-muted-foreground">Offen</div>
          <div className="font-medium">{openCount} Aufgaben</div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-muted-foreground">Heute fällig</div>
          <div className="font-medium">{dueTodayCount} Termine</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemStatusCard() {
  const STATUS = [
    { label: "Keine Regel aktiv", tone: "is-info" },
    { label: "Undo verfügbar", tone: "is-positive" },
    { label: "Transparenz sichtbar", tone: "is-info" },
  ] as const;
  return (
    <Card className="fp-card">
      <CardContent className="space-y-3 p-6">
        <h3 className="text-sm font-semibold tracking-tight">Systemstatus</h3>
        <ul className="flex flex-col gap-2">
          {STATUS.map((s) => (
            <li
              key={s.label}
              className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs"
            >
              <span className={cn("fp-status-dot", s.tone)} />
              {s.label}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function deriveTodayBuckets(tasks: Task[]) {
  const now = new Date();
  const startToday = startOfLocalDay(now);

  const enriched: TaskWithDue[] = tasks.map((t) => ({
    ...t,
    dueAt: t.dueDate ? new Date(t.dueDate) : undefined,
  }));

  const overdue = enriched.filter(
    (t) => t.dueAt && t.dueAt.getTime() < startToday.getTime(),
  );
  const today = enriched.filter((t) => t.dueAt && isSameLocalDay(t.dueAt, now));
  const focus: TaskWithDue[] = [...overdue, ...today];

  const focusIds = new Set(focus.map((t) => t.id));
  const noDate = enriched.filter((t) => !t.dueAt && !focusIds.has(t.id));
  for (const t of noDate) {
    if (focus.length >= 5) break;
    focus.push(t);
  }

  const agenda = today
    .filter((t) => t.dueAt && (t.dueAt.getHours() !== 0 || t.dueAt.getMinutes() !== 0))
    .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())
    .slice(0, 5)
    .map((t) => {
      const time = t.dueAt!.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const category = pickPrimaryCategory(t);
      const tone = categoryBadgeClass(categoryToneFor(category));
      return { time, title: t.title, tone };
    });

  const highlightedDates = enriched
    .filter((t) => t.dueAt)
    .map((t) => t.dueAt!);

  return {
    focus,
    agenda,
    dueTodayCount: today.length,
    openCount: enriched.length,
    highlightedDates,
  };
}
