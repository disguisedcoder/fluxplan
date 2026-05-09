"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskDeleteControl } from "./task-delete-control";
import { TaskCard } from "./task-card";
import type { Task } from "./types";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import {
  pickPrimaryCategory,
} from "@/lib/ui/category";

type Status = "all" | "open" | "done" | "archived";
type Priority = "all" | "low" | "medium" | "high";
type Quick = "all" | "today" | "overdue" | "week" | "no_date";
type Sort = "due_asc" | "due_desc" | "priority" | "created_desc" | "alpha";

const QUICK_FILTERS: { id: Quick; label: string }[] = [
  { id: "all", label: "Alle" },
  { id: "today", label: "Heute" },
  { id: "overdue", label: "Überfällig" },
  { id: "week", label: "Diese Woche" },
  { id: "no_date", label: "Ohne Datum" },
];

/** Explizite Trigger-Labels — Base UI kann sonst den Rohwert (`due_asc`) anzeigen, wenn Items nicht gemountet sind. */
const SORT_LABELS: Record<Sort, string> = {
  due_asc: "Fällig (aufsteigend)",
  due_desc: "Fällig (absteigend)",
  priority: "Priorität",
  created_desc: "Neu zuerst",
  alpha: "A–Z",
};

const STATUS_LABELS: Record<Status, string> = {
  all: "Alle",
  open: "Offen",
  done: "Erledigt",
  archived: "Archiv",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  all: "Alle",
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
};

export function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentDone, setRecentDone] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("open");
  const [priority, setPriority] = useState<Priority>("all");
  const [quick, setQuick] = useState<Quick>("all");
  const [sort, setSort] = useState<Sort>("due_asc");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [density, setDensity] = useState<"compact" | "comfort">("compact");
  const [recentDoneCollapsed, setRecentDoneCollapsed] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    overdue_today: false,
    next7: false,
    later: true,
    no_date: true,
  });

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status !== "all") p.set("status", status);
    if (priority !== "all") p.set("priority", priority);
    return p.toString();
  }, [q, status, priority]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks${queryString ? `?${queryString}` : ""}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        setTasks([]);
        return;
      }
      const data = await res.json();
      setTasks(data.tasks ?? []);

      // Best practice: "Offen" bleibt ruhig, aber erledigte Tasks sind 1 Klick entfernt
      // (und als eingeklappte Sektion sichtbar, damit man sie wiederfindet).
      if (status === "open") {
        void fetch("/api/tasks?status=done", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            const rows = (d?.tasks ?? []) as Task[];
            // Neueste zuerst (API sortiert nicht zwingend nach completedAt).
            rows.sort(
              (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            );
            setRecentDone(rows.slice(0, 10));
          })
          .catch(() => {
            setRecentDone([]);
          });
      } else {
        setRecentDone([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  // log filter_used (debounced)
  const logTimer = useRef<number | null>(null);
  useEffect(() => {
    if (logTimer.current) window.clearTimeout(logTimer.current);
    logTimer.current = window.setTimeout(() => {
      fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          eventType: "filter_used",
          screen: "/aufgaben",
          metadata: {
            q: q.trim() || null,
            status,
            priority,
            quick,
            sort,
          },
        }),
      }).catch(() => {});
    }, 600);
    return () => {
      if (logTimer.current) window.clearTimeout(logTimer.current);
    };
  }, [q, status, priority, quick, sort]);

  const filtered = useMemo(
    () => applyClientFilters(tasks, { quick, sort }),
    [tasks, quick, sort],
  );

  const counts = useMemo(() => {
    const today = applyClientFilters(tasks, { quick: "today", sort: "due_asc" }).length;
    const overdue = applyClientFilters(tasks, { quick: "overdue", sort: "due_asc" }).length;
    const week = applyClientFilters(tasks, { quick: "week", sort: "due_asc" }).length;
    const noDate = applyClientFilters(tasks, { quick: "no_date", sort: "due_asc" }).length;
    return { all: tasks.length, today, overdue, week, no_date: noDate };
  }, [tasks]);

  const sections = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const endOfNext7 = new Date(startOfToday);
    endOfNext7.setDate(endOfNext7.getDate() + 7);

    const overdueToday: Task[] = [];
    const next7: Task[] = [];
    const later: Task[] = [];
    const noDate: Task[] = [];

    for (const t of filtered) {
      if (!t.dueDate) {
        noDate.push(t);
        continue;
      }
      const d = new Date(t.dueDate);
      if (t.status !== "done" && d < startOfToday) {
        overdueToday.push(t);
      } else if (d >= startOfToday && d < endOfToday) {
        overdueToday.push(t);
      } else if (d >= endOfToday && d < endOfNext7) {
        next7.push(t);
      } else {
        later.push(t);
      }
    }

    return [
      { id: "overdue_today", label: "Heute & Überfällig", items: overdueToday },
      { id: "next7", label: "Nächste 7 Tage", items: next7 },
      { id: "later", label: "Später", items: later },
      { id: "no_date", label: "Ohne Datum", items: noDate },
    ] as const;
  }, [filtered]);

  return (
    <div className="space-y-5">
      <Card className="fp-card">
        <CardContent className="space-y-3 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Aufgaben durchsuchen…"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className="hidden md:inline-flex rounded-full border border-border/70 bg-card p-1 text-xs"
                role="tablist"
                aria-label="Statusfilter"
              >
                {(["open", "done", "archived"] as const).map((s) => {
                  const active = status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setStatus(s)}
                      className={cn(
                        "rounded-full px-3 py-1 font-medium transition-colors",
                        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                      )}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="tab"
                  aria-selected={status === "all"}
                  onClick={() => setStatus("all")}
                  className={cn(
                    "rounded-full px-3 py-1 font-medium transition-colors",
                    status === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  {STATUS_LABELS.all}
                </button>
              </div>

              <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <SelectTrigger className="w-full sm:w-[170px]">
                  <SelectValue>
                    {(v) =>
                      typeof v === "string" && v in SORT_LABELS
                        ? SORT_LABELS[v as Sort]
                        : "Sortierung"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_asc">Fällig (aufsteigend)</SelectItem>
                  <SelectItem value="due_desc">Fällig (absteigend)</SelectItem>
                  <SelectItem value="priority">Priorität</SelectItem>
                  <SelectItem value="created_desc">Neu zuerst</SelectItem>
                  <SelectItem value="alpha">A–Z</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={showAdvanced ? "secondary" : "outline"}
                onClick={() => setShowAdvanced((v) => !v)}
                aria-pressed={showAdvanced}
                className="w-full sm:w-auto"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter
              </Button>

              <Link
                href="/erstellen"
                className={cn(buttonVariants(), "w-full justify-center sm:w-auto")}
              >
                Neue Aufgabe
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((f) => {
              const active = quick === f.id;
              const count = counts[f.id as keyof typeof counts] ?? 0;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setQuick(f.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
                    active
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <span>{f.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0 text-[10px] tabular-nums",
                      active
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
            <div className="text-xs text-muted-foreground">
              {filtered.length} Aufgaben sichtbar
              {tasks.length !== filtered.length ? ` (von ${tasks.length})` : ""}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={density === "compact" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setDensity("compact")}
              >
                Kompakt
              </Button>
              <Button
                type="button"
                variant={density === "comfort" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setDensity("comfort")}
              >
                Komfort
              </Button>
            </div>
          </div>

          {showAdvanced ? (
            <div className="grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <div className="text-xs text-muted-foreground">Status</div>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v) =>
                        typeof v === "string" && v in STATUS_LABELS
                          ? STATUS_LABELS[v as Status]
                          : "Status"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="open">Offen</SelectItem>
                    <SelectItem value="done">Erledigt</SelectItem>
                    <SelectItem value="archived">Archiv</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <div className="text-xs text-muted-foreground">Priorität</div>
                <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(v) =>
                        typeof v === "string" && v in PRIORITY_LABELS
                          ? PRIORITY_LABELS[v as Priority]
                          : "Priorität"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="low">Niedrig</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {status === "open" && recentDone.length > 0 ? (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setRecentDoneCollapsed((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-left"
            aria-expanded={!recentDoneCollapsed}
          >
            <div className="flex items-center gap-2">
              {recentDoneCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Zuletzt erledigt
              </div>
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{recentDone.length}</span>
          </button>
          {recentDoneCollapsed ? null : (
            <div className="divide-y divide-border/50 rounded-xl border border-border/60 bg-card">
              {recentDone.slice(0, 10).map((t) => (
                <CompactTaskRow key={t.id} task={t} onChanged={load} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {loading ? (
        <Card className="fp-card">
          <CardContent className="p-6 text-sm text-muted-foreground">Lade Aufgaben…</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState onReset={() => setQuick("all")} hasFilter={quick !== "all" || q.length > 0} />
      ) : (
        <div className="space-y-6">
          {sections.map((s) => {
            if (s.items.length === 0) return null;
            const isCollapsed = Boolean(collapsed[s.id]);
            return (
              <section key={s.id} className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [s.id]: !Boolean(prev[s.id]) }))
                  }
                  className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-left"
                  aria-expanded={!isCollapsed}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">{s.items.length}</span>
                </button>
                {isCollapsed ? null : density === "comfort" ? (
                  <div className="grid gap-2.5">
                    {s.items.map((t) => (
                      <TaskCard key={t.id} task={t} onChanged={load} />
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-border/50 rounded-xl border border-border/60 bg-card">
                    {s.items.map((t) => (
                      <CompactTaskRow key={t.id} task={t} onChanged={load} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onReset, hasFilter }: { onReset: () => void; hasFilter: boolean }) {
  return (
    <Card className="fp-card">
      <CardContent className="space-y-3 p-8 text-center">
        <div className="text-sm font-medium">
          {hasFilter ? "Keine Treffer" : "Noch keine Aufgaben"}
        </div>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {hasFilter
            ? "Mit den aktuellen Filtern findet sich nichts. Du kannst die Auswahl zurücksetzen oder eine neue Aufgabe anlegen."
            : "Lege deine erste Aufgabe an. FluxPlan bleibt ruhig und schlägt nichts vor, solange du nichts änderst."}
        </p>
        <div className="flex justify-center gap-2 pt-1">
          {hasFilter ? (
            <Button variant="outline" onClick={onReset}>
              Filter zurücksetzen
            </Button>
          ) : null}
          <Link href="/erstellen" className={buttonVariants()}>
            Aufgabe anlegen
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function applyClientFilters(tasks: Task[], opts: { quick: Quick; sort: Sort }) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  let result = tasks.slice();

  switch (opts.quick) {
    case "today":
      result = result.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= startOfToday && d < endOfToday;
      });
      break;
    case "overdue":
      result = result.filter((t) => {
        if (!t.dueDate) return false;
        if (t.status === "done") return false;
        return new Date(t.dueDate) < startOfToday;
      });
      break;
    case "week":
      result = result.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= startOfToday && d < endOfWeek;
      });
      break;
    case "no_date":
      result = result.filter((t) => !t.dueDate);
      break;
    case "all":
    default:
      break;
  }

  const priorityRank = { high: 0, medium: 1, low: 2 } as const;
  switch (opts.sort) {
    case "due_asc":
      result.sort(byDueAsc);
      break;
    case "due_desc":
      result.sort((a, b) => -byDueAsc(a, b));
      break;
    case "priority":
      result.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || byDueAsc(a, b));
      break;
    case "created_desc":
      result.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    case "alpha":
      result.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }
  return result;
}

function byDueAsc(a: Task, b: Task) {
  const ad = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
  const bd = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
  return ad - bd;
}

function CompactTaskRow({ task, onChanged }: { task: Task; onChanged: () => void }) {
  const cat = pickPrimaryCategory(task);
  const due = task.dueDate ? formatDue(task.dueDate) : null;
  const overdue = task.status !== "done" && task.dueDate ? isOverdue(task.dueDate) : false;
  const [busy, setBusy] = useState(false);

  async function toggleDone(next: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next ? "done" : "open" }),
      });
      if (res.status === 401) {
        toast.error("Bitte starte zuerst eine Study Session.");
        return;
      }
      if (!res.ok) {
        toast.error("Konnte Aufgabe nicht aktualisieren.");
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Checkbox
        checked={task.status === "done"}
        onCheckedChange={(v) => toggleDone(Boolean(v))}
        disabled={busy}
        aria-label={`Aufgabe ${task.title} erledigen`}
      />
      <div className={cn("h-2.5 w-2.5 rounded-full", priorityDot(task.priority))} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm font-medium", task.status === "done" && "line-through text-muted-foreground")}>
          {task.title}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {due ? <span className={cn(overdue && "text-destructive")}>{due}</span> : <span>Ohne Datum</span>}
          {cat ? <span className="capitalize">{cat}</span> : null}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <TaskFormDialog mode="edit" initial={task} triggerLabel="Bearbeiten" onSaved={onChanged} />
        <TaskDeleteControl task={task} onDeleted={onChanged} disabled={busy} />
      </div>
    </div>
  );
}

function priorityDot(priority: Task["priority"]) {
  return priority === "high"
    ? "bg-rose-500/80"
    : priority === "medium"
      ? "bg-amber-500/80"
      : "bg-emerald-500/80";
}

function formatDue(dueDate: string) {
  const d = new Date(dueDate);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const datePart = sameDay(d, today)
    ? "Heute"
    : sameDay(d, tomorrow)
      ? "Morgen"
      : d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  return hasTime ? `${datePart} · ${time}` : datePart;
}

function isOverdue(dueDate: string) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(dueDate).getTime() < startOfToday.getTime();
}
