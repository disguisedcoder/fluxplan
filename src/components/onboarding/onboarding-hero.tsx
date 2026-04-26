import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
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
    body: "Fokusliste, Quick Add und Kalenderbezug bleiben sichtbar.",
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
            <Link
              href="/heute"
              className={buttonVariants({ size: "lg" })}
            >
              Erste Schritte
            </Link>
            <Link
              href="/heute"
              className={buttonVariants({ variant: "ghost" })}
            >
              Ohne Tour
            </Link>
          </div>
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
                Heute-Ansicht mit Fokusliste
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
