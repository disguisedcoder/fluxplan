"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Clock, HelpCircle, Undo2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdaptiveSuggestion } from "./types";
import { labelForStartHref, normalizeStartViewHref } from "@/lib/settings/start-view";
import {
  getSuggestionVisualMeta,
  suggestionAccentBorderClass,
  suggestionCategoryPillClass,
  suggestionIconWrapClass,
  suggestionStraplineClass,
} from "./suggestion-visuals";
import { notifyFluxplanPreferencesChanged } from "@/lib/ui/preferences-sync";
import { reportSuggestionRespondFailure } from "@/lib/ui/suggestion-respond-errors";
import {
  readReminderSnoozeDaysPref,
  readReminderSuggestionSnoozeUntil,
  REMINDER_SNOOZE_DAYS_PREF_KEY,
  REMINDER_SNOOZE_UNTIL_PREF_KEY,
} from "@/lib/settings/reminder-snooze";
import type { Preferences } from "./suggestions-screen";

const RULE_LABELS: Record<string, string> = {
  view_preference: "Startansicht",
  reminder_preference: "Erinnerungen",
  daily_focus: "Fokus-Hinweis",
  calendar_conflict: "Konflikte",
  adaptive_task_creation: "Erstellen",
  adaptive_optional_fold: "Formular kompakt",
  adaptive_optional_unfold: "Formular ausgeklappt",
};

function ruleLabelFor(ruleKey: string) {
  return RULE_LABELS[ruleKey] ?? "Vorschlag";
}

function formatReminderSnoozeDateDe(d: Date) {
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ReminderSnoozeCallout({
  preferences,
  personalizationReminderHref,
}: {
  preferences: Preferences;
  personalizationReminderHref: string;
}) {
  const until = readReminderSuggestionSnoozeUntil(preferences[REMINDER_SNOOZE_UNTIL_PREF_KEY]);
  const days = readReminderSnoozeDaysPref(preferences[REMINDER_SNOOZE_DAYS_PREF_KEY]);
  if (!until) return null;
  // eslint-disable-next-line react-hooks/purity -- „Vertagen aktiv“ hängt von der aktuellen Uhrzeit ab
  const active = until.getTime() > Date.now();
  if (!active) return null;
  const label = formatReminderSnoozeDateDe(until);
  return (
    <Card
      className="fp-card-soft border-amber-500/30 bg-amber-500/[0.07]"
      data-testid="fp-reminder-snooze-callout"
    >
      <CardContent className="space-y-2 p-4 text-sm">
        <div className="font-medium text-foreground">Erinnerungs-Vorschläge vertagt („Nicht jetzt“)</div>
        <p className="text-xs text-muted-foreground">
          Neue Erinnerungs-Vorschläge frühestens wieder ab{" "}
          <span className="font-medium text-foreground">{label}</span> (lokaler Kalendertag, Tagesbeginn).
        </p>
        <p className="text-xs text-muted-foreground">
          Aktuell eingestellt: <span className="font-medium text-foreground">{days}</span> Kalendertage pro „Nicht
          jetzt“.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Wartezeit ändern</span> oder{" "}
          <span className="font-medium text-foreground">Vertagen beenden</span>: Tab{" "}
          <Link
            href={personalizationReminderHref}
            className="font-medium text-primary underline-offset-4 hover:underline"
            prefetch={false}
          >
            Personalisierung
          </Link>{" "}
          → Karte „Erinnerungs-Vorschläge vertagen“ (oder unten beim vertagten Vorschlag im Detail).
        </p>
      </CardContent>
    </Card>
  );
}

export function AdaptationsTab({
  suggestions,
  loading,
  onChanged,
  stats,
  preferences,
  personalizationReminderHref,
}: {
  suggestions: AdaptiveSuggestion[];
  loading: boolean;
  onChanged: () => void;
  stats: { total: number; accepted: number; rejected: number; snoozed: number; pending: number };
  preferences: Preferences;
  personalizationReminderHref: string;
}) {
  const pending = useMemo(() => suggestions.filter((s) => s.status === "pending"), [suggestions]);
  const history = useMemo(
    () => suggestions.filter((s) => s.status !== "pending").slice(0, 30),
    [suggestions],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const active = useMemo(
    () => suggestions.find((s) => s.id === activeId) ?? pending[0] ?? history[0] ?? null,
    [suggestions, activeId, pending, history],
  );

  useEffect(() => {
    if (!active) return;
    if (active.status !== "pending") return;
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventType: "suggestion_seen",
        screen: "/anpassungen",
        metadata: { suggestionId: active.id, ruleKey: active.ruleKey },
      }),
    }).catch(() => {});
  }, [active]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-3">
        <ReminderSnoozeCallout
          preferences={preferences}
          personalizationReminderHref={personalizationReminderHref}
        />
        <Card className="fp-card">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold tracking-tight">Aktive Vorschläge</h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {pending.length}
              </span>
            </div>
            {loading ? (
              <div className="text-sm text-muted-foreground">Lade …</div>
            ) : pending.length === 0 ? (
              <EmptyPending />
            ) : (
              <ul className="space-y-2">
                {pending.map((s) => (
                  <SuggestionRow
                    key={s.id}
                    s={s}
                    active={s.id === active?.id}
                    onSelect={() => setActiveId(s.id)}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="fp-card">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Verlauf</h3>
              <span className="text-xs tabular-nums text-muted-foreground">
                {stats.total - stats.pending}
              </span>
            </div>
            {history.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Noch keine Entscheidungen aufgezeichnet.
              </div>
            ) : (
              <ul className="space-y-2">
                {history.map((s) => (
                  <SuggestionRow
                    key={s.id}
                    s={s}
                    active={s.id === active?.id}
                    onSelect={() => setActiveId(s.id)}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <DetailPanel
        suggestion={active}
        preferences={preferences}
        personalizationReminderHref={personalizationReminderHref}
        onSuggestionAction={() => {
          setActiveId(null);
          onChanged();
        }}
        reloadSuggestions={onChanged}
      />
    </div>
  );
}

function SuggestionRow({
  s,
  active,
  onSelect,
}: {
  s: AdaptiveSuggestion;
  active: boolean;
  onSelect: () => void;
}) {
  const meta = getSuggestionVisualMeta(s.ruleKey);
  const RowIcon = meta.Icon;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-start gap-3 rounded-xl border-b border-l-4 border-r border-t py-2.5 pl-2 pr-3 text-left transition-colors",
          suggestionAccentBorderClass(meta.accent),
          active
            ? "border-b-primary/40 border-r-primary/40 border-t-primary/40 bg-primary/[0.06]"
            : "border-b-border/60 border-r-border/60 border-t-border/60 bg-card hover:bg-muted/30",
        )}
      >
        <div
          className={cn(
            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
            suggestionIconWrapClass(meta.accent, active),
          )}
        >
          <RowIcon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{s.title}</div>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                suggestionCategoryPillClass(meta.accent),
              )}
            >
              {meta.categoryShort}
            </span>
            <span className="text-muted-foreground/80">·</span>
            <span className="truncate">
              {labelForStatus(s.status)} · {ruleLabelFor(s.ruleKey)}
            </span>
          </div>
        </div>
      </button>
    </li>
  );
}

function SnoozedReminderDetailPanel({
  preferences,
  personalizationReminderHref,
  reloadSuggestions,
}: {
  preferences: Preferences;
  personalizationReminderHref: string;
  reloadSuggestions: () => void;
}) {
  const until = readReminderSuggestionSnoozeUntil(preferences[REMINDER_SNOOZE_UNTIL_PREF_KEY]);
  const daysPref = readReminderSnoozeDaysPref(preferences[REMINDER_SNOOZE_DAYS_PREF_KEY]);
  const [draft, setDraft] = useState(String(daysPref));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(String(readReminderSnoozeDaysPref(preferences[REMINDER_SNOOZE_DAYS_PREF_KEY])));
  }, [preferences]);

  async function saveDays() {
    const n = Math.min(30, Math.max(1, Math.round(Number(draft))));
    if (!Number.isFinite(n)) {
      toast.error("Bitte eine Zahl zwischen 1 und 30 eingeben.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: REMINDER_SNOOZE_DAYS_PREF_KEY, value: n }),
      });
      if (!res.ok) {
        toast.error("Konnte Einstellung nicht speichern.");
        return;
      }
      toast.success("Tage gespeichert.", {
        description:
          "Wenn Vertagen aktiv war, wurde das früheste Datum ab heute mit der neuen Tageszahl neu gesetzt.",
      });
      notifyFluxplanPreferencesChanged();
      reloadSuggestions();
    } finally {
      setBusy(false);
    }
  }

  async function clearVertagen() {
    setBusy(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: REMINDER_SNOOZE_UNTIL_PREF_KEY, value: null }),
      });
      if (!res.ok) {
        toast.error("Konnte Vertagen nicht beenden.");
        return;
      }
      toast.success("Vertagen beendet.");
      notifyFluxplanPreferencesChanged();
      reloadSuggestions();
    } finally {
      setBusy(false);
    }
  }

  // eslint-disable-next-line react-hooks/purity
  const untilActive = until && until.getTime() > Date.now();
  const untilLabel = until ? formatReminderSnoozeDateDe(until) : null;

  return (
    <section
      className="space-y-3 rounded-xl border border-amber-500/35 bg-amber-500/[0.06] p-4"
      data-testid="fp-snoozed-reminder-detail"
    >
      <div className="text-xs font-medium uppercase tracking-wider text-amber-900/90 dark:text-amber-100/90">
        Vertagen (Erinnerungs-Vorschläge)
      </div>
      {untilActive && untilLabel ? (
        <p className="text-sm text-muted-foreground">
          Nächste Erinnerungs-Vorschläge frühestens wieder ab{" "}
          <span className="font-medium text-foreground">{untilLabel}</span> (lokaler Kalendertag, Tagesbeginn).
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Kein aktives Vertagen-Datum in den Einstellungen — du kannst trotzdem die Standard-Tageszahl für künftige
          „Nicht jetzt“-Klicks anpassen.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Standard nach jedem „Nicht jetzt“: <span className="font-medium text-foreground">{daysPref}</span>{" "}
        Kalendertage (ab heute gezählt bis zum frühesten Tag neuer Vorschläge).
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="fp-snooze-days-inline">
            Tage bis zum nächsten Vorschlag
          </label>
          <Input
            id="fp-snooze-days-inline"
            type="number"
            min={1}
            max={30}
            className="w-24"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={busy}
          />
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => void saveDays()} disabled={busy}>
          Speichern
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void clearVertagen()} disabled={busy}>
          Vertagen beenden
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Alle Texte und Optionen auch unter{" "}
        <Link
          href={personalizationReminderHref}
          className="font-medium text-primary underline-offset-4 hover:underline"
          prefetch={false}
        >
          Personalisierung → Erinnerungs-Vorschläge vertagen
        </Link>
        .
      </p>
    </section>
  );
}

function DetailPanel({
  suggestion,
  preferences,
  personalizationReminderHref,
  onSuggestionAction,
  reloadSuggestions,
}: {
  suggestion: AdaptiveSuggestion | null;
  preferences: Preferences;
  personalizationReminderHref: string;
  onSuggestionAction: () => void;
  reloadSuggestions: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const whyLogged = useRef(false);

  if (!suggestion) {
    return (
      <Card className="fp-card">
        <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
          Wähle einen Vorschlag links, um Erklärung und Aktionen zu sehen.
        </CardContent>
      </Card>
    );
  }

  async function respond(action: "accept" | "reject" | "snooze" | "undo") {
    setBusy(true);
    try {
      const res = await fetch(`/api/suggestions/${suggestion!.id}/respond`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (await reportSuggestionRespondFailure(res)) return;
      const body = (await res.json()) as { reminderSnooze?: { until: string; days: number } };
      const snoozeDesc =
        action === "snooze" && suggestion!.ruleKey === "reminder_preference" && body.reminderSnooze
          ? `Frühestens wieder ab ${formatReminderSnoozeDateDe(new Date(body.reminderSnooze.until))} (${body.reminderSnooze.days} Kalendertage). Details siehst du direkt unter diesem Vorschlag.`
          : action === "snooze" && suggestion!.ruleKey === "reminder_preference"
            ? "Frist und Tage: oberer Hinweis auf dieser Seite oder Tab „Personalisierung“ → „Erinnerungs-Vorschläge vertagen“."
            : undefined;
      toast.success(
        action === "accept"
          ? "Vorschlag angenommen."
          : action === "reject"
            ? "Vorschlag abgelehnt."
            : action === "snooze"
              ? "Vertagt."
              : "Änderung rückgängig — Vorschlag wieder offen.",
        snoozeDesc ? { description: snoozeDesc } : undefined,
      );
      onSuggestionAction();
      notifyFluxplanPreferencesChanged();
      if (action === "accept" && suggestion!.type === "start_view") {
        const p =
          suggestion!.payload && typeof suggestion!.payload === "object"
            ? (suggestion!.payload as Record<string, unknown>)
            : {};
        const raw = typeof p.suggestedStartView === "string" ? p.suggestedStartView : "/heute";
        router.push(normalizeStartViewHref(raw));
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  function logWhy() {
    if (whyLogged.current) return;
    whyLogged.current = true;
    fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventType: "why_clicked",
        screen: "/anpassungen",
        metadata: { suggestionId: suggestion!.id, ruleKey: suggestion!.ruleKey },
      }),
    }).catch(() => {});
  }

  const isPending = suggestion.status === "pending";
  const canReopenSuggestion =
    suggestion.status === "accepted" ||
    suggestion.status === "snoozed" ||
    suggestion.status === "rejected" ||
    suggestion.status === "undone";
  const meta = getSuggestionVisualMeta(suggestion.ruleKey);
  const HeaderIcon = meta.Icon;

  return (
    <Card
      className={cn("fp-card overflow-hidden border-l-4", suggestionAccentBorderClass(meta.accent))}
    >
      <CardContent className="space-y-5 p-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                  suggestionIconWrapClass(meta.accent, true),
                )}
              >
                <HeaderIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {labelForStatus(suggestion.status)}
                </div>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">{suggestion.title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      suggestionCategoryPillClass(meta.accent),
                    )}
                  >
                    {meta.categoryShort}
                  </span>
                  <span>
                    {ruleLabelFor(suggestion.ruleKey)} · erstellt {formatDate(suggestion.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] capitalize",
              statusBadgeClass(suggestion.status),
            )}
          >
            {labelForStatus(suggestion.status)}
          </span>
        </header>

        <p
          className={cn(
            "rounded-lg border px-3 py-2.5 text-sm leading-snug",
            suggestionStraplineClass(meta.accent),
          )}
        >
          {meta.strapline}
        </p>

        <section className="space-y-2 rounded-xl border border-border/60 bg-card/60 p-4">
          <button
            type="button"
            onClick={logWhy}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Warum sehe ich das?
          </button>
          <p className="text-sm text-muted-foreground">{suggestion.explanation}</p>
        </section>

        <section className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Was passiert beim Annehmen
          </div>
          <PayloadPreview payload={suggestion.payload} type={suggestion.type} />
        </section>

        {suggestion.ruleKey === "reminder_preference" && suggestion.status === "snoozed" ? (
          <SnoozedReminderDetailPanel
            preferences={preferences}
            personalizationReminderHref={personalizationReminderHref}
            reloadSuggestions={reloadSuggestions}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          {isPending ? (
            <>
              <Button onClick={() => respond("accept")} disabled={busy}>
                <Check className="h-4 w-4" />
                Annehmen
              </Button>
              <Button variant="outline" onClick={() => respond("snooze")} disabled={busy}>
                <Clock className="h-4 w-4" />
                Nicht jetzt
              </Button>
              <Button variant="ghost" onClick={() => respond("reject")} disabled={busy}>
                <X className="h-4 w-4" />
                Ablehnen
              </Button>
            </>
          ) : canReopenSuggestion ? (
            <div className="w-full space-y-2">
              <Button variant="outline" onClick={() => respond("undo")} disabled={busy}>
                <Undo2 className="h-4 w-4" />
                {suggestion.status === "accepted" ? "Rückgängig" : "Wieder öffnen"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {suggestion.status === "accepted" ? (
                  <>
                    Setzt die <span className="font-medium text-foreground">Annahme</span> zurück (inkl. gespeicherter
                    Einstellungen, falls welche gesetzt wurden) und zeigt den Vorschlag wieder unter{" "}
                    <span className="font-medium text-foreground">Aktive Vorschläge</span>.
                  </>
                ) : (
                  <>
                    Hebt <span className="font-medium text-foreground">Vertagen</span> oder{" "}
                    <span className="font-medium text-foreground">Ablehnen</span> auf — der Vorschlag erscheint wieder
                    unter <span className="font-medium text-foreground">Aktive Vorschläge</span>, damit du neu
                    entscheiden kannst (inkl. Erinnerungs-Vertagen in der Personalisierung, falls zutreffend).
                  </>
                )}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Dieser Status wird nicht mehr unterstützt.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PayloadPreview({ payload, type }: { payload: unknown; type: string }) {
  const obj = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;

  if (type === "start_view") {
    const href = normalizeStartViewHref(String(obj.suggestedStartView ?? "/heute"));
    return (
      <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm">
        Deine Startansicht wird auf{" "}
        <span className="font-medium text-foreground">{labelForStartHref(href)}</span> gesetzt.
      </div>
    );
  }
  if (type === "reminder_suggestion") {
    return (
      <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm space-y-2">
        <p>Für diese Aufgabe wird eine Erinnerung eingetragen. Du kannst sie jederzeit ändern oder entfernen.</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Annehmen</span> löscht ein laufendes Vertagen (du hast die
          Erinnerung ja übernommen). <span className="font-medium text-foreground">Rückgängig</span> entfernt die
          Erinnerung wieder und räumt Vertagen auf — ein neuer Vorschlag kann danach erscheinen.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Nicht jetzt</span> gilt nur für diesen{" "}
          <span className="font-medium text-foreground">offenen</span> Vorschlag und speichert Frist und Tageszahl.
          Nach Vertagen: im <span className="font-medium text-foreground">Verlauf</span> den Eintrag wählen — dort
          erscheinen <span className="font-medium text-foreground">Datum, Tage und Buttons</span> zum Anpassen;
          gleiches gilt unter <span className="font-medium text-foreground">Personalisierung</span>.
        </p>
      </div>
    );
  }
  if (type === "daily_focus") {
    return (
      <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm">
        Es werden keine Aufgaben geändert. Ohne Annahme blendet die To-Do-Liste auf „Heute“ überfällige Aufgaben aus
        (nur heute und später); nach Annahme erscheinen Überfällige dort und werden zusammen mit heute fälligen Zeilen
        rot hervorgehoben.
      </div>
    );
  }
  if (type === "task_form_chips") {
    return (
      <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm">
        Beim Annehmen werden die vorgeschlagenen Zusatzfelder als aktive Chips gespeichert (unter
        „Erstellen“ / Bearbeiten sichtbar). Bestehende Aufgaben werden nicht geändert; du entscheidest
        weiterhin pro neuer Aufgabe.
      </div>
    );
  }
  if (type === "task_form_optional_unfold") {
    return (
      <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm space-y-2">
        <p>
          Beim <span className="font-medium text-foreground">Annehmen</span> wird die Einstellung{" "}
          <span className="font-medium text-foreground">Zusatzfelder eingeklappt</span> zurückgenommen — der Bereich
          ist beim Anlegen wieder standardmäßig offen.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Nicht jetzt</span> und{" "}
          <span className="font-medium text-foreground">Ablehnen</span> wirken wie bei anderen adaptiven Vorschlägen;
          nach Annahme kannst du im Verlauf <span className="font-medium text-foreground">Rückgängig</span> wählen.
        </p>
      </div>
    );
  }
  if (type === "task_form_optional_fold") {
    return (
      <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm space-y-2">
        <p>
          Beim <span className="font-medium text-foreground">Annehmen</span> wird{" "}
          <span className="font-medium text-foreground">Zusatzfelder eingeklappt</span> gespeichert — beim Anlegen
          siehst du zuerst nur die Kernfelder; <span className="font-medium text-foreground">Weitere Felder</span>{" "}
          blendet den Bereich jederzeit wieder ein.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Nicht jetzt</span> vertagt den Vorschlag (wie bei anderen
          Regeln), <span className="font-medium text-foreground">Ablehnen</span> lehnt ab. Bestehende Aufgaben werden
          nicht geändert.
        </p>
      </div>
    );
  }
  if (type === "calendar_conflict") {
    return (
      <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm">
        FluxPlan verschiebt keine Termine oder Aufgaben. Der Hinweis dient nur der Einordnung der
        geschätzten Dauer an diesem Tag.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm">
      Nichts passiert automatisch: FluxPlan setzt nur dann etwas um, wenn du den Vorschlag annimmst.
    </div>
  );
}

function EmptyPending() {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
      Aktuell keine offenen Vorschläge. FluxPlan reagiert nur auf wiederkehrende Muster.
    </div>
  );
}

function labelForStatus(s: string) {
  switch (s) {
    case "pending":
      return "Offen";
    case "accepted":
      return "Angenommen";
    case "rejected":
      return "Abgelehnt";
    case "snoozed":
      return "Vertagt";
    case "undone":
      return "Rückgängig";
    default:
      return s;
  }
}

function statusBadgeClass(s: string) {
  switch (s) {
    case "pending":
      return "bg-primary/10 text-primary border-primary/30";
    case "accepted":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "snoozed":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "undone":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
