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
import { cn } from "@/lib/utils";
import { normalizeStartViewHref } from "@/lib/settings/start-view";
import { notifyFluxplanPreferencesChanged } from "@/lib/ui/preferences-sync";

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
  const [suggestion, setSuggestion] = useState<AdaptiveSuggestion | null>(null);

  const isBaseline = me?.session?.variant === "baseline";
  const hideOnPath =
    pathname.startsWith("/anpassungen") ||
    pathname === "/" ||
    !me?.user ||
    isBaseline;

  const loadPendingSuggestion = useCallback(async () => {
    const res = await fetch("/api/suggestions?status=pending", { cache: "no-store" });
    if (!res.ok) {
      setSuggestion(null);
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
    setSuggestion(preferred ?? suggestions[0] ?? null);
  }, []);

  useEffect(() => {
    if (hideOnPath) {
      setSuggestion(null);
      return;
    }
    let cancelled = false;
    (async () => {
      await fetch("/api/adaptive/evaluate", {
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

  const seenLogged = useRef(false);

  useEffect(() => {
    if (seenLogged.current) return;
    seenLogged.current = true;
    fetch("/api/events", {
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
        ? suggestion.type === "start_view"
          ? "Startansicht gespeichert."
          : "Übernommen."
        : action === "snooze"
          ? "Vertagt."
          : "Abgelehnt.",
    );
    onChanged();
    if (action === "accept" && suggestion.type === "daily_focus") {
      notifyFluxplanPreferencesChanged();
    }
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
                  Die Listen auf dieser Seite kommen aus deinen Aufgaben.{" "}
                  <span className="font-medium text-foreground">Annehmen</span> ändert keine Aufgaben, hebt aber
                  überfällige und heute fällige Einträge in der To-Do-Liste rot hervor.
                </div>
              ) : null}
              {suggestion.ruleKey === "adaptive_task_creation" || suggestion.type === "task_form_chips" ? (
                <div className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Unter <span className="font-medium text-foreground">Neue Aufgabe</span> blendet FluxPlan die
                  vorgeschlagenen Zusatzfelder als Chips ein. „Annehmen“ speichert die Vorauswahl — du entscheidest
                  weiterhin
                  pro Aufgabe.
                </div>
              ) : null}
              {suggestion.ruleKey === "calendar_conflict" || suggestion.type === "calendar_conflict" ? (
                <div className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  FluxPlan verschiebt keine Termine. „Annehmen“ bestätigt nur, dass du den Hinweis gesehen hast.
                </div>
              ) : null}
              {suggestion.ruleKey === "adaptive_optional_fold" ||
              suggestion.type === "task_form_optional_fold" ? (
                <div className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Mit <span className="font-medium text-foreground">Annehmen</span> wird gespeichert, dass der Bereich{" "}
                  <span className="font-medium text-foreground">Zusatzfelder</span> beim Anlegen zunächst eingeklappt
                  ist. Du kannst ihn jederzeit aufklappen; unter{" "}
                  <span className="font-medium text-foreground">Einstellungen</span> lässt sich das zurücksetzen.
                </div>
              ) : null}
              {suggestion.ruleKey === "adaptive_optional_unfold" ||
              suggestion.type === "task_form_optional_unfold" ? (
                <div className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Mit <span className="font-medium text-foreground">Annehmen</span> werden die Zusatzfelder beim Anlegen
                  wieder standardmäßig sichtbar (wie ohne Einklappen).
                </div>
              ) : null}
              {suggestion.type === "start_view" ? (
                <div className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Mit <span className="font-medium text-foreground">Annehmen</span> wird deine{" "}
                  <span className="font-medium text-foreground">Startansicht</span> gespeichert und du springst
                  sofort dorthin.
                </div>
              ) : null}
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
