"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Clock, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button, buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/page-header";
import { QuickAddInput } from "@/components/tasks/quick-add-input";
import { MiniMonthCalendar } from "./mini-month-calendar";
import type { Task } from "@/components/tasks/types";
import type { AdaptiveSuggestion } from "@/components/adaptive/types";
import { ExplanationPopover } from "@/components/adaptive/explanation-popover";
import {
  getSuggestionVisualMeta,
  suggestionAccentBorderClass,
  suggestionCategoryPillClass,
  suggestionIconWrapClass,
  suggestionStraplineClass,
} from "@/components/adaptive/suggestion-visuals";
import { cn } from "@/lib/utils";
import {
  categoryBadgeClass,
  categoryToneFor,
  pickPrimaryCategory,
} from "@/lib/ui/category";
import { isSameLocalDay, startOfLocalDay } from "./date";
import { normalizeStartViewHref } from "@/lib/settings/start-view";

type TaskWithDue = Task & { dueAt?: Date };

export function TodayDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingSuggestion, setPendingSuggestion] = useState<AdaptiveSuggestion | null>(null);
  const [justCompleted, setJustCompleted] = useState<Task[]>([]);
  const [isBaseline, setIsBaseline] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?status=open", { cache: "no-store" });
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPendingSuggestion = useCallback(async () => {
    const res = await fetch("/api/suggestions?status=pending", { cache: "no-store" });
    if (!res.ok) {
      setPendingSuggestion(null);
      return;
    }
    const data = await res.json();
    const suggestions = (data.suggestions ?? []) as AdaptiveSuggestion[];
    const preferred = suggestions.find(
      (s) =>
        s.ruleKey === "daily_focus" ||
        s.ruleKey === "view_preference" ||
        s.type === "start_view",
    );
    setPendingSuggestion(preferred ?? suggestions[0] ?? null);
  }, []);

  useEffect(() => {
    load();
    // Baseline: keine Vorschläge laden, keine Evaluate-Calls starten (normale App bleibt voll nutzbar).
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((me: { session?: { variant?: string | null } | null }) => {
        const baseline = me?.session?.variant === "baseline";
        setIsBaseline(baseline);
        if (baseline) return;
        fetch("/api/adaptive/evaluate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ screen: "/heute" }),
        }).catch(() => {});
        loadPendingSuggestion().catch(() => {});
      })
      .catch(() => {
        setIsBaseline(false);
        fetch("/api/adaptive/evaluate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ screen: "/heute" }),
        }).catch(() => {});
        loadPendingSuggestion().catch(() => {});
      });
  }, [load, loadPendingSuggestion]);

  const { focus, agenda, dueTodayCount, openCount, highlightedDates, dayCountsByStamp, dayTasksByStamp } = useMemo(
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

      {!isBaseline && pendingSuggestion ? (
        <div className="mb-6">
          <TodaySuggestionBanner
            suggestion={pendingSuggestion}
            onChanged={() => {
              loadPendingSuggestion().catch(() => {});
              load().catch(() => {});
            }}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr_1fr]">
        <FocusListCard
          tasks={focus}
          justCompleted={justCompleted}
          loading={loading}
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
          <SystemStatusCard isBaseline={isBaseline} hasSuggestion={Boolean(pendingSuggestion)} />
        </div>
      </div>
    </div>
  );
}

function TodaySuggestionBanner({
  suggestion,
  onChanged,
}: {
  suggestion: AdaptiveSuggestion;
  onChanged: () => void;
}) {
  const router = useRouter();
  /** Regeln ohne persistierte Datenänderung in applySuggestion (Zustimmung / Hinweis). */
  const isInformationalOnly =
    suggestion.ruleKey === "daily_focus" ||
    suggestion.type === "daily_focus" ||
    suggestion.ruleKey === "calendar_conflict" ||
    suggestion.type === "calendar_conflict" ||
    suggestion.ruleKey === "adaptive_task_creation" ||
    suggestion.type === "task_form_chips";

  const meta = getSuggestionVisualMeta(suggestion.ruleKey);
  const BannerIcon = meta.Icon;

  const seenLogged = useRef(false);

  useEffect(() => {
    if (seenLogged.current) return;
    seenLogged.current = true;
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventType: "suggestion_seen",
        screen: "/heute",
        metadata: { suggestionId: suggestion.id, ruleKey: suggestion.ruleKey },
      }),
    }).catch(() => {});
  }, [suggestion.id, suggestion.ruleKey]);

  async function respond(action: "accept" | "reject" | "snooze") {
    const res = await fetch(`/api/suggestions/${suggestion.id}/respond`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      toast.error("Aktion fehlgeschlagen.");
      return;
    }
    toast.success(
      action === "accept"
        ? isInformationalOnly
          ? "Notiert."
          : suggestion.type === "start_view"
            ? "Startansicht gespeichert."
            : "Übernommen."
        : action === "snooze"
          ? "Vertagt."
          : "Abgelehnt.",
    );
    onChanged();
    if (action === "accept" && suggestion.type === "start_view") {
      const p =
        suggestion.payload && typeof suggestion.payload === "object"
          ? (suggestion.payload as Record<string, unknown>)
          : {};
      const raw = typeof p.suggestedStartView === "string" ? p.suggestedStartView : "/heute";
      router.push(normalizeStartViewHref(raw));
      router.refresh();
    }
  }

  return (
    <Card
      className={cn(
        "fp-card overflow-hidden border-y border-r border-primary/15 bg-primary/[0.03] border-l-4",
        suggestionAccentBorderClass(meta.accent),
      )}
    >
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <div
              className={cn(
                "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                suggestionIconWrapClass(meta.accent, true),
              )}
            >
              <BannerIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    suggestionCategoryPillClass(meta.accent),
                  )}
                >
                  {meta.categoryShort}
                </span>
              </div>
              <div className="mt-1 truncate text-sm font-semibold tracking-tight">{suggestion.title}</div>
              <p
                className={cn(
                  "mt-2 max-w-xl rounded-md border px-2.5 py-1.5 text-xs leading-relaxed",
                  suggestionStraplineClass(meta.accent),
                )}
              >
                {meta.strapline}
              </p>
              <div className="mt-2 truncate text-xs text-muted-foreground">{suggestion.explanation}</div>
              {suggestion.ruleKey === "daily_focus" || suggestion.type === "daily_focus" ? (
                <div className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Die <span className="font-medium text-foreground">To‑Do‑Liste</span> darunter kommt aus deinen offenen
                  Aufgaben (überfällig, heute fällig, hohe Priorität, sonst Auffüller). Dieser Hinweis{" "}
                  <span className="font-medium text-foreground">ändert keine Aufgaben</span> — „Verstanden“ bestätigt
                  nur den Hinweis (z. B. für die Studienauswertung) und blendet ihn aus.
                </div>
              ) : null}
              {suggestion.ruleKey === "adaptive_task_creation" || suggestion.type === "task_form_chips" ? (
                <div className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Unter <span className="font-medium text-foreground">Neue Aufgabe</span> kann FluxPlan dir passende
                  Zusatzfelder als Chips vorschlagen. „Verstanden“ speichert nur die Zustimmung zu diesem Konzept —
                  bestehende Aufgaben bleiben unverändert.
                </div>
              ) : null}
              {suggestion.ruleKey === "calendar_conflict" || suggestion.type === "calendar_conflict" ? (
                <div className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  FluxPlan verschiebt keine Termine. „Verstanden“ bestätigt nur, dass du den Hinweis gesehen hast.
                </div>
              ) : null}
              {suggestion.ruleKey === "adaptive_optional_fold" ||
              suggestion.type === "task_form_optional_fold" ? (
                <div className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Mit <span className="font-medium text-foreground">Ja</span> wird gespeichert, dass der Bereich{" "}
                  <span className="font-medium text-foreground">Zusatzfelder</span> beim Anlegen zunächst
                  eingeklappt ist. Du kannst ihn jederzeit aufklappen; unter{" "}
                  <span className="font-medium text-foreground">Einstellungen</span> lässt sich das zurücksetzen.
                </div>
              ) : null}
              {suggestion.type === "start_view" ? (
                <div className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Mit <span className="font-medium text-foreground">Ja</span> wird deine{" "}
                  <span className="font-medium text-foreground">Startansicht</span> gespeichert und du springst
                  sofort dorthin. In der Sidebar öffnet <span className="font-medium text-foreground">Start</span> ab
                  dann genau diese Seite (Heute, Kalender, …). Tour und Prinzipien bleiben unter{" "}
                  <span className="font-medium text-foreground">Willkommen</span> erreichbar.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => respond("accept")} className="gap-2">
            <Check className="h-4 w-4" />
            {isInformationalOnly ? "Verstanden" : "Ja"}
          </Button>
          <Button variant="outline" onClick={() => respond("snooze")} className="gap-2">
            <Clock className="h-4 w-4" />
            Nicht jetzt
          </Button>
          <Button variant="ghost" onClick={() => respond("reject")} className="gap-2">
            <X className="h-4 w-4" />
            Ablehnen
          </Button>
          <ExplanationPopover
            explanation={suggestion.explanation}
            onOpen={() => {
              fetch("/api/events", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  eventType: "why_clicked",
                  screen: "/heute",
                  metadata: { suggestionId: suggestion.id, ruleKey: suggestion.ruleKey },
                }),
              }).catch(() => {});
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FocusListCard({
  tasks,
  justCompleted,
  loading,
  onChanged,
  onJustCompletedChange,
}: {
  tasks: TaskWithDue[];
  justCompleted: Task[];
  loading: boolean;
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
          Für heute zusammengestellt (überfällig, heute fällig, Priorität, dann Auffüller).
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
              <FocusListItem
                key={t.id}
                task={t}
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
                      const res = await fetch(`/api/tasks/${t.id}`, {
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

function FocusListItem({
  task,
  onChanged,
  onJustCompleted,
}: {
  task: TaskWithDue;
  onChanged: () => void;
  onJustCompleted: (t: Task) => void;
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
    return task.listName ?? "ohne Uhrzeit";
  })();

  async function toggleDone(next: boolean) {
    if (next) {
      const ok = window.confirm(`Als erledigt markieren?\n\n${task.title}`);
      if (!ok) return;
    }
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next ? "done" : "open" }),
    });
    if (next) onJustCompleted(task);
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
        <h3 className="text-sm font-semibold tracking-tight">Woche im Überblick</h3>
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

function SystemStatusCard({
  isBaseline,
  hasSuggestion,
}: {
  isBaseline: boolean;
  hasSuggestion: boolean;
}) {
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

function deriveTodayBuckets(tasks: Task[]) {
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
    dayCountsByStamp,
    dayTasksByStamp,
  };
}
