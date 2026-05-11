"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { QuickAddInput } from "@/components/tasks/quick-add-input";
import { MiniMonthCalendar } from "./mini-month-calendar";
import type { Task } from "@/components/tasks/types";
import { studyApiFetch } from "@/lib/http/study-api-fetch";
import { cn } from "@/lib/utils";
import {
  categoryBadgeClass,
  categoryToneFor,
  pickPrimaryCategory,
} from "@/lib/ui/category";
import { isSameLocalDay, startOfLocalDay } from "./date";
import {
  DAILY_FOCUS_LIST_HIGHLIGHT_PREF_KEY,
  readDailyFocusListHighlightPref,
} from "@/lib/settings/daily-focus-list-highlight";
import { FLUXPLAN_PREFERENCES_CHANGED } from "@/lib/ui/preferences-sync";

type TaskWithDue = Task & { dueAt?: Date };

export function TodayDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [justCompleted, setJustCompleted] = useState<Task[]>([]);
  const [isBaseline, setIsBaseline] = useState(false);
  const [dailyFocusListHighlight, setDailyFocusListHighlight] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [tasksRes, prefRes] = await Promise.all([
        studyApiFetch("/api/tasks?status=open", { cache: "no-store", signal }),
        studyApiFetch("/api/preferences", { cache: "no-store", signal }),
      ]);
      if (signal?.aborted) return;
      const data = await tasksRes.json();
      setTasks(data.tasks ?? []);
      if (prefRes.ok) {
        const prefJson = await prefRes.json();
        const prefs = prefJson.preferences ?? {};
        setDailyFocusListHighlight(readDailyFocusListHighlightPref(prefs[DAILY_FOCUS_LIST_HIGHLIGHT_PREF_KEY]));
      }
    } catch (e) {
      if (signal?.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;
    queueMicrotask(() => {
      void load(signal);
    });
    studyApiFetch("/api/me", { cache: "no-store", signal })
      .then((r) => r.json())
      .then((me: { session?: { variant?: string | null } | null }) => {
        if (signal.aborted) return;
        setIsBaseline(me?.session?.variant === "baseline");
      })
      .catch(() => {
        if (!signal.aborted) setIsBaseline(false);
      });
    return () => ac.abort();
  }, [load]);

  useEffect(() => {
    const onPrefs = () => {
      load();
    };
    window.addEventListener(FLUXPLAN_PREFERENCES_CHANGED, onPrefs);
    return () => window.removeEventListener(FLUXPLAN_PREFERENCES_CHANGED, onPrefs);
  }, [load]);

  const {
    focus,
    agenda,
    dueTodayCount,
    overdueCount,
    openCount,
    highlightedDates,
    dayCountsByStamp,
    dayTasksByStamp,
  } = useMemo(
    () => deriveTodayBuckets(tasks, { focusIncludesOverdue: dailyFocusListHighlight }),
    [tasks, dailyFocusListHighlight],
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
          overdueCount={overdueCount}
          justCompleted={justCompleted}
          loading={loading}
          emphasizeDueRows={dailyFocusListHighlight}
          onChanged={load}
          onJustCompletedChange={setJustCompleted}
        />

        <div className="space-y-6">
          <AgendaCard agenda={agenda} loading={loading} />
          <QuietHintsCard />
        </div>

        <div className="space-y-6">
          <WeekGlanceCard
            highlightedDates={highlightedDates}
            dayCountsByStamp={dayCountsByStamp}
            dayTasksByStamp={dayTasksByStamp}
            openCount={openCount}
            dueTodayCount={dueTodayCount}
          />
          <SystemStatusCard isBaseline={isBaseline} />
        </div>
      </div>
    </div>
  );
}

function FocusListCard({
  tasks,
  overdueCount,
  justCompleted,
  loading,
  emphasizeDueRows,
  onChanged,
  onJustCompletedChange,
}: {
  tasks: TaskWithDue[];
  overdueCount: number;
  justCompleted: Task[];
  loading: boolean;
  emphasizeDueRows: boolean;
  onChanged: () => void;
  onJustCompletedChange: React.Dispatch<React.SetStateAction<Task[]>>;
}) {
  return (
    <Card className="fp-card">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">To‑Do‑Liste</h2>
          <Link
            href="/aufgaben"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Alle Aufgaben (inkl. Erledigt)
          </Link>
        </div>
        <div className="text-xs text-muted-foreground">
          {emphasizeDueRows ? (
            <>
              Mit angenommenem Fokus-Hinweis: überfällige und heute fällige Aufgaben stehen vorn und sind in der Liste
              rot hervorgehoben; danach folgen weitere Termine.
            </>
          ) : (
            <>
              Ohne Fokus-Hinweis: die Liste zeigt <span className="font-medium text-foreground">heute</span> und{" "}
              <span className="font-medium text-foreground">später fällige</span> Termine — überfällige Aufgaben
              bleiben bewusst außen vor (weiter unter{" "}
              <Link href="/aufgaben" className="font-medium text-primary underline-offset-4 hover:underline">
                Aufgaben
              </Link>
              ).
            </>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Lade …</div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
            {overdueCount > 0 && !emphasizeDueRows ? (
              <>
                In dieser To‑Do‑Liste stehen aktuell keine heute oder später fälligen Aufgaben.{" "}
                {overdueCount === 1
                  ? "Eine überfällige Aufgabe ist ausgeblendet"
                  : `${overdueCount} überfällige Aufgaben sind ausgeblendet`}{" "}
                — nach <span className="font-medium text-foreground">Annehmen</span> des Fokus-Hinweises (unter
                Anpassungen) erscheinen Überfällige hier und werden rot markiert. Unter{" "}
                <Link href="/aufgaben" className="font-medium text-primary underline-offset-4 hover:underline">
                  Aufgaben
                </Link>{" "}
                siehst du den vollen Bestand.
              </>
            ) : (
              <>Heute ist nichts fällig. Du kannst trotzdem fokussiert arbeiten.</>
            )}
          </div>
        ) : (
          <ul
            className={cn(
              "space-y-2",
              tasks.length > 5 && "max-h-[22rem] overflow-y-auto pr-1",
            )}
          >
            {tasks.map((t) => (
              <FocusListItem
                key={t.id}
                task={t}
                emphasizeDueRows={emphasizeDueRows}
                onChanged={onChanged}
                onJustCompleted={(doneTask) => {
                  onJustCompletedChange((prev) => {
                    const next = [doneTask, ...prev.filter((x) => x.id !== doneTask.id)];
                    return next.slice(0, 5);
                  });
                }}
              />
            ))}
          </ul>
        )}

        {!loading && tasks.length > 0 && overdueCount > 0 && !emphasizeDueRows ? (
          <p className="text-[11px] text-muted-foreground">
            {overdueCount === 1
              ? "Eine überfällige Aufgabe ist in dieser Liste ausgeblendet."
              : `${overdueCount} überfällige Aufgaben sind in dieser Liste ausgeblendet.`}{" "}
            <Link href="/aufgaben" className="font-medium text-primary underline-offset-4 hover:underline">
              Aufgaben
            </Link>{" "}
            zeigt alles; mit Fokus-Hinweis (Anpassungen) kannst du Überfällige hier rot hervorheben.
          </p>
        ) : null}

        {justCompleted.length > 0 ? (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Gerade erledigt
            </div>
            <ul className="mt-2 space-y-2">
              {justCompleted.slice(0, 3).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium line-through text-muted-foreground">
                      {t.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">Du kannst es direkt wieder öffnen.</div>
                  </div>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={async () => {
                      const res = await studyApiFetch(`/api/tasks/${t.id}`, {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ status: "open" }),
                      });
                      if (res.ok) {
                        toast.success("Wieder geöffnet.");
                        onJustCompletedChange((prev) => prev.filter((x) => x.id !== t.id));
                        onChanged();
                      } else {
                        toast.error("Konnte nicht wieder öffnen.");
                      }
                    }}
                  >
                    Rückgängig
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="pt-1">
          <QuickAddInput onCreated={onChanged} />
        </div>
      </CardContent>
    </Card>
  );
}

const FOCUS_ROW_OVERDUE_EMPHASIS =
  "border-rose-500/45 bg-rose-500/[0.06] dark:border-rose-500/35 dark:bg-rose-950/30";

function focusListDuePresentation(task: TaskWithDue, emphasizeDueRows: boolean) {
  const now = new Date();
  const startToday = startOfLocalDay(now);

  if (!task.dueAt) {
    return {
      meta: task.listName ?? "ohne Uhrzeit",
      metaClassName: "text-muted-foreground",
      rowClassName: "border-border/60 bg-card",
    } as const;
  }

  const d = task.dueAt;
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;

  if (d.getTime() < startToday.getTime()) {
    const dateStr = d.toLocaleDateString([], {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const meta = hasTime
      ? `Überfällig · ${dateStr} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : `Überfällig · ${dateStr}`;
    if (!emphasizeDueRows) {
      return {
        meta,
        metaClassName: "text-muted-foreground",
        rowClassName: "border-border/60 bg-card",
      } as const;
    }
    return {
      meta,
      metaClassName: "font-medium text-destructive",
      rowClassName: FOCUS_ROW_OVERDUE_EMPHASIS,
    } as const;
  }

  if (isSameLocalDay(d, now)) {
    const meta = hasTime
      ? `Heute fällig · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : "Heute fällig · ganztägig";
    if (!emphasizeDueRows) {
      return {
        meta,
        metaClassName: "text-muted-foreground",
        rowClassName: "border-border/60 bg-card",
      } as const;
    }
    return {
      meta,
      metaClassName: "font-medium text-destructive",
      rowClassName: FOCUS_ROW_OVERDUE_EMPHASIS,
    } as const;
  }

  const dateStr = d.toLocaleDateString([], {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  const meta = hasTime
    ? `Fällig ${dateStr} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : `Fällig ${dateStr}`;
  return {
    meta,
    metaClassName: "text-muted-foreground",
    rowClassName: "border-border/60 bg-card",
  } as const;
}

function FocusListItem({
  task,
  emphasizeDueRows,
  onChanged,
  onJustCompleted,
}: {
  task: TaskWithDue;
  emphasizeDueRows: boolean;
  onChanged: () => void;
  onJustCompleted: (t: Task) => void;
}) {
  const category = pickPrimaryCategory(task);
  const tone = categoryToneFor(category);
  const { meta, metaClassName, rowClassName } = focusListDuePresentation(task, emphasizeDueRows);

  async function toggleDone(next: boolean) {
    if (next) {
      const ok = window.confirm(`Als erledigt markieren?\n\n${task.title}`);
      if (!ok) return;
    }
    await studyApiFetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next ? "done" : "open" }),
    });
    if (next) onJustCompleted(task);
    onChanged();
  }

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
        rowClassName,
      )}
    >
      <Checkbox
        checked={task.status === "done"}
        onCheckedChange={(v) => toggleDone(Boolean(v))}
        aria-label={`Aufgabe ${task.title} erledigen`}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{task.title}</div>
        <div className={cn("truncate text-xs", metaClassName)}>{meta}</div>
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
        <h3 className="text-sm font-semibold tracking-tight">Heute im Überblick</h3>
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
  dayCountsByStamp,
  dayTasksByStamp,
  openCount,
  dueTodayCount,
}: {
  highlightedDates: Date[];
  dayCountsByStamp: Record<string, number>;
  dayTasksByStamp: Record<string, { id: string; title: string }[]>;
  openCount: number;
  dueTodayCount: number;
}) {
  return (
    <Card className="fp-card">
      <CardContent className="space-y-4 p-6">
        <h3 className="text-sm font-semibold tracking-tight">Monat im Überblick</h3>
        <MiniMonthCalendar
          highlightedDates={highlightedDates}
          dayCountsByStamp={dayCountsByStamp}
          dayTasksByStamp={dayTasksByStamp}
        />
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

function SystemStatusCard({ isBaseline }: { isBaseline: boolean }) {
  const [pendingSuggestionCount, setPendingSuggestionCount] = useState(0);

  useEffect(() => {
    if (isBaseline) {
      return;
    }
    let cancelled = false;
    studyApiFetch("/api/suggestions?status=pending", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { suggestions?: unknown[] } | null) => {
        if (cancelled || !data?.suggestions) return;
        setPendingSuggestionCount(data.suggestions.length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isBaseline]);

  const hasSuggestion = !isBaseline && pendingSuggestionCount > 0;

  const STATUS = [
    {
      label: isBaseline ? "Modus: Baseline (ohne Vorschläge)" : "Modus: Adaptive",
      tone: isBaseline ? ("is-warning" as const) : ("is-info" as const),
    },
    {
      label: hasSuggestion ? "Vorschlag verfügbar" : "Keine Vorschläge offen",
      tone: hasSuggestion ? ("is-positive" as const) : ("is-info" as const),
    },
    { label: "Undo: direkte Rückgängig-Aktion bei Bedarf", tone: "is-positive" as const },
    { label: "Transparenz: „Warum?“ erklärt Vorschläge", tone: "is-info" as const },
  ] as const;
  return (
    <Card className="fp-card">
      <CardContent className="space-y-3 p-6">
        <h3 className="text-sm font-semibold tracking-tight">Status</h3>
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

function deriveTodayBuckets(
  tasks: Task[],
  opts: { focusIncludesOverdue: boolean },
) {
  const now = new Date();
  const startToday = startOfLocalDay(now);

  const dayCountsByStamp: Record<string, number> = {};
  const dayTasksByStamp: Record<string, { id: string; title: string }[]> = {};

  const enriched: TaskWithDue[] = tasks.map((t) => ({
    ...t,
    dueAt: t.dueDate ? new Date(t.dueDate) : undefined,
  }));
  for (const t of enriched) {
    if (!t.dueAt) continue;
    const d = new Date(t.dueAt);
    d.setHours(0, 0, 0, 0);
    const key = String(d.getTime());
    dayCountsByStamp[key] = (dayCountsByStamp[key] ?? 0) + 1;
    (dayTasksByStamp[key] ??= []).push({ id: t.id, title: t.title });
  }

  const overdue = enriched.filter(
    (t) => t.dueAt && t.dueAt.getTime() < startToday.getTime(),
  );
  const today = enriched.filter((t) => t.dueAt && isSameLocalDay(t.dueAt, now));

  let focus: TaskWithDue[];
  if (opts.focusIncludesOverdue) {
    focus = [...overdue, ...today];
  } else {
    focus = [...today];
    const future = enriched
      .filter(
        (t) =>
          t.dueAt &&
          t.dueAt.getTime() >= startToday.getTime() &&
          !isSameLocalDay(t.dueAt, now),
      )
      .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime());
    for (const t of future) {
      if (focus.length >= 5) break;
      focus.push(t);
    }
  }

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
    overdueCount: overdue.length,
    openCount: enriched.length,
    highlightedDates,
    dayCountsByStamp,
    dayTasksByStamp,
  };
}
