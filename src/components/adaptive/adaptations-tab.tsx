"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Clock, HelpCircle, Sparkles, Undo2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AdaptiveSuggestion } from "./types";

export function AdaptationsTab({
  suggestions,
  loading,
  onChanged,
  stats,
}: {
  suggestions: AdaptiveSuggestion[];
  loading: boolean;
  onChanged: () => void;
  stats: { total: number; accepted: number; rejected: number; snoozed: number; pending: number };
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

      <DetailPanel suggestion={active} onChanged={onChanged} />
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
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
          active
            ? "border-primary/40 bg-primary/[0.06]"
            : "border-border/60 bg-card hover:bg-muted/30",
        )}
      >
        <div
          className={cn(
            "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
            active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{s.title}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {labelForStatus(s.status)} · Regel: {s.ruleKey}
          </div>
        </div>
      </button>
    </li>
  );
}

function DetailPanel({
  suggestion,
  onChanged,
}: {
  suggestion: AdaptiveSuggestion | null;
  onChanged: () => void;
}) {
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
      if (!res.ok) {
        toast.error("Aktion fehlgeschlagen.");
        return;
      }
      toast.success(
        action === "accept"
          ? "Vorschlag angenommen."
          : action === "reject"
            ? "Vorschlag abgelehnt."
            : action === "snooze"
              ? "Später erinnert."
              : "Rückgängig.",
      );
      onChanged();
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

  return (
    <Card className="fp-card">
      <CardContent className="space-y-5 p-6">
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {labelForStatus(suggestion.status)}
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              {suggestion.title}
            </h2>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Regel: {suggestion.ruleKey} · erstellt {formatDate(suggestion.createdAt)}
            </div>
          </div>
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] capitalize",
              statusBadgeClass(suggestion.status),
            )}
          >
            {labelForStatus(suggestion.status)}
          </span>
        </header>

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
          ) : suggestion.status === "accepted" ? (
            <Button variant="outline" onClick={() => respond("undo")} disabled={busy}>
              <Undo2 className="h-4 w-4" />
              Rückgängig
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              Diese Entscheidung ist abgeschlossen.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PayloadPreview({ payload, type }: { payload: unknown; type: string }) {
  const obj = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;

  if (type === "start_view") {
    return (
      <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm">
        Startansicht setzen auf{" "}
        <span className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          {String(obj.suggestedStartView ?? "/heute")}
        </span>
      </div>
    );
  }
  if (type === "reminder_suggestion") {
    return (
      <div className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm">
        Erinnerung am{" "}
        <span className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          {String(obj.proposedReminderAt ?? "—")}
        </span>{" "}
        eintragen.
      </div>
    );
  }
  return (
    <pre className="overflow-x-auto rounded-md border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
      {JSON.stringify(obj, null, 2)}
    </pre>
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
