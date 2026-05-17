"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Clock, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AdaptiveSuggestion } from "./types";
import { ExplanationPopover } from "@/components/adaptive/explanation-popover";
import {
  getSuggestionVisualMeta,
  suggestionAccentBorderClass,
  suggestionCategoryPillClass,
  suggestionIconWrapClass,
  suggestionStraplineClass,
} from "@/components/adaptive/suggestion-visuals";
import { studyApiFetch } from "@/lib/http/study-api-fetch";
import { cn } from "@/lib/utils";
import { normalizeStartViewHref, suggestedStartViewHrefFromPayload } from "@/lib/settings/start-view";
import { CalendarOverloadAcceptStrapline } from "@/components/adaptive/calendar-overload-accept-strapline";
import { DailyFocusAcceptStrapline } from "@/components/adaptive/daily-focus-accept-strapline";
import { ReminderAcceptStrapline } from "@/components/adaptive/reminder-accept-strapline";
import { StartViewAcceptStrapline } from "@/components/adaptive/start-view-accept-strapline";
import {
  TaskFormChipsAcceptStrapline,
  TaskFormOptionalFoldAcceptStrapline,
  TaskFormOptionalUnfoldAcceptStrapline,
} from "@/components/adaptive/task-form-accept-strapline";
import {
  reminderSnoozeToastDescription,
  reminderSnoozeToastDescriptionFallback,
  reminderSnoozeToastTitle,
  suggestionSnoozeButtonLabel,
} from "@/lib/adaptive/reminder-suggestion-copy";
import { notifyFluxplanPreferencesChanged } from "@/lib/ui/preferences-sync";
import { reportSuggestionRespondFailure } from "@/lib/ui/suggestion-respond-errors";

type Me = {
  user: { pseudonym: string } | null;
  session: { variant?: string | null } | null;
};

export function PendingAdaptiveSuggestionBanner({
  pathname,
  me,
}: {
  pathname: string;
  me: Me | null;
}) {
  const [storedSuggestion, setStoredSuggestion] = useState<AdaptiveSuggestion | null>(null);

  const isBaseline = me?.session?.variant === "baseline";
  const hideOnPath =
    pathname.startsWith("/anpassungen") ||
    pathname === "/" ||
    !me?.user ||
    isBaseline;

  const suggestion = hideOnPath ? null : storedSuggestion;

  const loadPendingSuggestion = useCallback(async () => {
    const res = await studyApiFetch("/api/suggestions?status=pending", { cache: "no-store" });
    if (!res.ok) {
      setStoredSuggestion(null);
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
    setStoredSuggestion(preferred ?? suggestions[0] ?? null);
  }, []);

  useEffect(() => {
    if (hideOnPath) {
      return;
    }
    let cancelled = false;
    (async () => {
      await studyApiFetch("/api/adaptive/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ screen: pathname }),
      }).catch(() => {});
      if (cancelled) return;
      await loadPendingSuggestion().catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [hideOnPath, pathname, loadPendingSuggestion]);

  if (hideOnPath || !suggestion) return null;

  return (
    <div className="mb-6">
      <PendingSuggestionBannerInner
        key={suggestion.id}
        suggestion={suggestion}
        screen={pathname}
        onChanged={() => {
          loadPendingSuggestion().catch(() => {});
        }}
      />
    </div>
  );
}

function PendingSuggestionBannerInner({
  suggestion,
  screen,
  onChanged,
}: {
  suggestion: AdaptiveSuggestion;
  screen: string;
  onChanged: () => void;
}) {
  const router = useRouter();

  const meta = getSuggestionVisualMeta(suggestion.ruleKey);
  const BannerIcon = meta.Icon;
  const isStartViewSuggestion =
    suggestion.ruleKey === "view_preference" || suggestion.type === "start_view";
  const isDailyFocusSuggestion =
    suggestion.ruleKey === "daily_focus" || suggestion.type === "daily_focus";
  const isCalendarConflictSuggestion =
    suggestion.ruleKey === "calendar_conflict" || suggestion.type === "calendar_conflict";
  const isReminderSuggestion =
    suggestion.ruleKey === "reminder_preference" || suggestion.type === "reminder_suggestion";
  const isTaskFormChipsSuggestion =
    suggestion.ruleKey === "adaptive_task_creation" || suggestion.type === "task_form_chips";
  const isTaskFormOptionalFoldSuggestion =
    suggestion.ruleKey === "adaptive_optional_fold" || suggestion.type === "task_form_optional_fold";
  const isTaskFormOptionalUnfoldSuggestion =
    suggestion.ruleKey === "adaptive_optional_unfold" || suggestion.type === "task_form_optional_unfold";
  const startViewHref = isStartViewSuggestion
    ? suggestedStartViewHrefFromPayload(suggestion.payload)
    : null;

  const seenLogged = useRef(false);

  useEffect(() => {
    if (seenLogged.current) return;
    seenLogged.current = true;
    studyApiFetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventType: "suggestion_seen",
        screen,
        metadata: { suggestionId: suggestion.id, ruleKey: suggestion.ruleKey },
      }),
    }).catch(() => {});
  }, [suggestion.id, suggestion.ruleKey, screen]);

  async function respond(action: "accept" | "reject" | "snooze") {
    const res = await studyApiFetch(`/api/suggestions/${suggestion.id}/respond`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (await reportSuggestionRespondFailure(res)) return;
    const body = (await res.json()) as { reminderSnooze?: { until: string; days: number } };
    const reminderDesc =
      action === "snooze" && isReminderSuggestion && body.reminderSnooze
        ? reminderSnoozeToastDescription(new Date(body.reminderSnooze.until), body.reminderSnooze.days, "banner")
        : action === "snooze" && isReminderSuggestion
          ? reminderSnoozeToastDescriptionFallback()
          : undefined;
    toast.success(
      action === "accept"
        ? suggestion.type === "start_view"
          ? "Startansicht gespeichert."
          : "Übernommen."
        : action === "snooze"
          ? reminderSnoozeToastTitle()
          : "Abgelehnt.",
      reminderDesc ? { description: reminderDesc } : undefined,
    );
    onChanged();
    notifyFluxplanPreferencesChanged();
    if (action === "accept" && suggestion.type === "start_view") {
      const p =
        suggestion.payload && typeof suggestion.payload === "object"
          ? (suggestion.payload as Record<string, unknown>)
          : {};
      const raw = typeof p.suggestedStartView === "string" ? p.suggestedStartView : "/heute";
      router.push(normalizeStartViewHref(raw));
      router.refresh();
    }
    if (action === "accept" && isCalendarConflictSuggestion) {
      router.push("/kalender");
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
                {startViewHref ? (
                  <StartViewAcceptStrapline href={startViewHref} />
                ) : isDailyFocusSuggestion ? (
                  <DailyFocusAcceptStrapline />
                ) : isCalendarConflictSuggestion ? (
                  <CalendarOverloadAcceptStrapline />
                ) : isReminderSuggestion ? (
                  <ReminderAcceptStrapline />
                ) : isTaskFormChipsSuggestion ? (
                  <TaskFormChipsAcceptStrapline />
                ) : isTaskFormOptionalFoldSuggestion ? (
                  <TaskFormOptionalFoldAcceptStrapline />
                ) : isTaskFormOptionalUnfoldSuggestion ? (
                  <TaskFormOptionalUnfoldAcceptStrapline />
                ) : (
                  meta.strapline
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => respond("accept")} className="gap-2">
            <Check className="h-4 w-4" />
            Annehmen
          </Button>
          <Button variant="outline" onClick={() => respond("snooze")} className="gap-2">
            <Clock className="h-4 w-4" />
            {suggestionSnoozeButtonLabel(suggestion.ruleKey)}
          </Button>
          <Button variant="ghost" onClick={() => respond("reject")} className="gap-2">
            <X className="h-4 w-4" />
            Ablehnen
          </Button>
          <ExplanationPopover
            explanation={suggestion.explanation}
            onOpen={() => {
              studyApiFetch("/api/events", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  eventType: "why_clicked",
                  screen,
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
