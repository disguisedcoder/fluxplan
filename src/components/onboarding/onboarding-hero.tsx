"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { isGuestStudyPseudonym } from "@/lib/demo/guest-study";

import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { studyApiFetch } from "@/lib/http/study-api-fetch";
import { DEFAULT_START_HREF } from "@/lib/settings/start-view";
import { cn } from "@/lib/utils";

const PRINCIPLE_TAGS = [
  { label: "Stabile Basis", tone: "is-positive" },
  { label: "Erklärbar", tone: "is-info" },
  { label: "Rückgängig", tone: "is-warning" },
] as const;

const PRINCIPLES = [
  {
    tone: "is-positive",
    title: "Heute als Startpunkt",
    body: "To‑Do‑Liste, Quick Add und Kalenderbezug bleiben sichtbar.",
  },
  {
    tone: "is-info",
    title: "Keine heimlichen Sprünge",
    body: "Layout bleibt konstant und vorhersagbar.",
  },
  {
    tone: "is-info",
    title: "Vorschläge nur mit Kontrolle",
    body: "Übernehmen, Später, Ablehnen, Undo.",
  },
] as const;

const SAMPLE_TODAY = [
  { title: "Gliederung", meta: "Heute · 15:00 Fokusblock", chip: "Heute" },
  { title: "Mockups prüfen", meta: "Morgen · Review", chip: "Review" },
] as const;

export function OnboardingHero() {
  const router = useRouter();
  const [showGuestDemoStories, setShowGuestDemoStories] = useState(false);

  const refreshGuest = useCallback(async () => {
    const r = await studyApiFetch("/api/me", { cache: "no-store" });
    if (!r.ok) {
      setShowGuestDemoStories(false);
      return;
    }
    const d = (await r.json()) as { user?: { pseudonym?: string } | null };
    setShowGuestDemoStories(isGuestStudyPseudonym(d.user?.pseudonym));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshGuest();
  }, [refreshGuest]);

  async function markSeenAndGo() {
    const headers = { "content-type": "application/json" };
    await studyApiFetch("/api/preferences", {
      method: "PUT",
      headers,
      body: JSON.stringify({ key: "seenWelcome", value: true }),
    }).catch(() => {});
    // Ohne `startView` leitet `/start` wieder auf Willkommen — Standard-Startansicht nach Tour.
    await studyApiFetch("/api/preferences", {
      method: "PUT",
      headers,
      body: JSON.stringify({ key: "startView", value: { href: DEFAULT_START_HREF } }),
    }).catch(() => {});
    router.push("/start");
    router.refresh();
  }

  async function loadDemo(storyKey: "family" | "task") {
    const res = await studyApiFetch("/api/data/demo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storyKey }),
    });
    if (res.status === 401) {
      toast.error("Bitte starte zuerst eine Study Session.", {
        description: "Du findest den Einstieg unter „Einstellungen“.",
      });
      router.push("/einstellungen");
      return;
    }
    if (!res.ok) {
      toast.error("Demo-Daten konnten nicht geladen werden.");
      return;
    }
    toast.success("Demo-Daten geladen.");
    await studyApiFetch("/api/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: "startView", value: { href: DEFAULT_START_HREF } }),
    }).catch(() => {});
    router.push("/start");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="fp-card">
        <CardContent className="space-y-5 p-6 md:p-8">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">
              So funktioniert der Einstieg
            </h2>
            <p className="text-sm text-muted-foreground">
              Die Basis bleibt ruhig. Vorschläge kommen später.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRINCIPLE_TAGS.map((tag) => (
              <span
                key={tag.label}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-xs"
              >
                <span className={cn("fp-status-dot", tag.tone)} />
                {tag.label}
              </span>
            ))}
          </div>

          <ul className="space-y-3">
            {PRINCIPLES.map((p) => (
              <li
                key={p.title}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/70 p-4"
              >
                <span className={cn("fp-status-dot mt-2 shrink-0", p.tone)} />
                <div>
                  <div className="text-sm font-medium">{p.title}</div>
                  <div className="text-sm text-muted-foreground">{p.body}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button size="lg" onClick={markSeenAndGo}>
              Erste Schritte
            </Button>
            <Button variant="ghost" onClick={markSeenAndGo}>
              Ohne Tour
            </Button>
            <Link href="/einstellungen" className={buttonVariants({ variant: "outline" })}>
              User-Code setzen
            </Link>
          </div>

          {showGuestDemoStories ? (
            <div className="rounded-xl border border-border/60 bg-card/60 p-4">
              <div className="text-sm font-semibold tracking-tight">Demo-Story (nur Gast)</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Optional: rollenbasierte Beispielaufgaben laden (ersetzt die aktuelle Session). Adaptiver Gast hat oft
                schon den Workshop-Stand nach dem Start.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => loadDemo("family")}>
                  Familienplanner
                </Button>
                <Button variant="outline" onClick={() => loadDemo("task")}>
                  Taskplanner
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="fp-card">
          <CardContent className="space-y-3 p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Heute</h3>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                Ruhig
              </span>
            </div>
            <ul className="space-y-2">
              {SAMPLE_TODAY.map((item) => (
                <li
                  key={item.title}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-3 py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      aria-hidden
                      className="h-4 w-4 shrink-0 rounded-md border border-border/70"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {item.title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {item.meta}
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                    {item.chip}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="fp-card">
          <CardContent className="space-y-3 p-5 md:p-6">
            <h3 className="text-sm font-semibold tracking-tight">
              Was direkt sichtbar ist
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="fp-status-dot is-info" />
                Heute-Ansicht mit To‑Do‑Liste
              </li>
              <li className="flex items-center gap-2">
                <span className="fp-status-dot is-info" />
                Aufgaben und Kalender getrennt lesbar
              </li>
            </ul>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Stat label="Regeln" value="0 aktiv" />
              <Stat label="Undo" value="bereit" tone="is-positive" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "is-info",
}: {
  label: string;
  value: string;
  tone?: "is-info" | "is-positive" | "is-warning" | "is-danger";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 flex items-center gap-2 text-sm font-medium">
        <span className={cn("fp-status-dot", tone)} />
        {value}
      </div>
    </div>
  );
}
