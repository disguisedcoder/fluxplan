"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

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
import { TaskCard } from "./task-card";
import type { Task } from "./types";
import {
  categoryToneFor,
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

export function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status>("open");
  const [priority, setPriority] = useState<Priority>("all");
  const [quick, setQuick] = useState<Quick>("all");
  const [sort, setSort] = useState<Sort>("due_asc");
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const grouped = useMemo(() => groupByCategory(filtered), [filtered]);

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

            <div className="flex items-center gap-2">
              <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
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
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter
              </Button>

              <Link href="/erstellen" className={buttonVariants()}>
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

          {showAdvanced ? (
            <div className="grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <div className="text-xs text-muted-foreground">Status</div>
                <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
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
                    <SelectValue />
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

      {loading ? (
        <Card className="fp-card">
          <CardContent className="p-6 text-sm text-muted-foreground">Lade Aufgaben…</CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState onReset={() => setQuick("all")} hasFilter={quick !== "all" || q.length > 0} />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.label} className="space-y-2">
              <header className="flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {group.label}
                </h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {group.items.length}
                </span>
              </header>
              <div className="grid gap-2.5">
                {group.items.map((t) => (
                  <TaskCard key={t.id} task={t} onChanged={load} />
                ))}
              </div>
            </section>
          ))}
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

function groupByCategory(tasks: Task[]) {
  const map = new Map<string, { label: string; tone: ReturnType<typeof categoryToneFor>; items: Task[] }>();
  for (const t of tasks) {
    const cat = pickPrimaryCategory(t) ?? "Ohne Kategorie";
    const tone = categoryToneFor(cat === "Ohne Kategorie" ? null : cat);
    const key = cat.toLowerCase();
    if (!map.has(key)) map.set(key, { label: cat, tone, items: [] });
    map.get(key)!.items.push(t);
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}
