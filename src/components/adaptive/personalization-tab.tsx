"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlayCircle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { AdaptiveRule } from "./types";
import type { Preferences } from "./suggestions-screen";
import { InterventionLevelSlider } from "@/components/settings/intervention-level-slider";

const LEVELS = [
  { value: 0, label: "Aus", desc: "Keine adaptiven Vorschläge." },
  { value: 1, label: "Leise", desc: "Nur sehr seltene, eindeutige Vorschläge." },
  { value: 2, label: "Aktiv", desc: "Standard. Vorschläge erscheinen bei klaren Mustern." },
  { value: 3, label: "Eng begleitet", desc: "Häufiger Vorschläge, alle erklärbar und reversibel." },
];

export function PersonalizationTab({
  rules,
  preferences,
  stats,
  onChanged,
}: {
  rules: AdaptiveRule[];
  preferences: Preferences;
  stats: { total: number; accepted: number; rejected: number; snoozed: number };
  onChanged: () => void;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const interventionLevel = readNumber(preferences["adaptive.interventionLevel"], 2);

  async function evaluateNow() {
    setEvaluating(true);
    try {
      const res = await fetch("/api/adaptive/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ screen: "/anpassungen", metadata: { trigger: "manual" } }),
      });
      if (!res.ok) {
        toast.error("Konnte Heuristiken nicht prüfen.");
        return;
      }
      const data = (await res.json()) as { createdCount?: number };
      const count = data.createdCount ?? 0;
      if (count === 0) {
        toast.message("Keine neuen Vorschläge", {
          description: "Es liegen aktuell keine ausreichenden Muster vor.",
        });
      } else {
        toast.success(`${count} neue Vorschlag${count === 1 ? "" : "e"} erstellt.`);
      }
      onChanged();
    } finally {
      setEvaluating(false);
    }
  }

  async function toggleRule(key: string, enabled: boolean) {
    setBusyKey(key);
    try {
      const res = await fetch("/api/rules", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });
      if (!res.ok) {
        toast.error("Konnte Regel nicht ändern.");
        return;
      }
      onChanged();
    } finally {
      setBusyKey(null);
    }
  }

  async function setLevel(value: number) {
    await fetch("/api/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: "adaptive.interventionLevel", value }),
    });
    onChanged();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-4">
        <Card className="fp-card">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold tracking-tight">Aktive Regeln</h2>
              <span className="text-xs text-muted-foreground">{rules.length}</span>
            </div>

            {rules.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Keine Regeln gefunden. Bitte Seed neu laufen lassen.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {rules.map((r) => (
                  <li key={r.key} className="flex items-start gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{r.name}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {r.key}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    </div>
                    <Switch
                      checked={r.enabled}
                      disabled={busyKey === r.key}
                      onCheckedChange={(v) => toggleRule(r.key, Boolean(v))}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="fp-card">
          <CardContent className="space-y-3 p-5">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Eingriffsstufe</h3>
              <p className="text-xs text-muted-foreground">
                Wie aufdringlich darf FluxPlan sein? Du kannst es jederzeit ändern.
              </p>
            </div>
            <InterventionLevelSlider
              value={interventionLevel}
              levels={LEVELS}
              onChange={setLevel}
            />
          </CardContent>
        </Card>

        <Card className="fp-card-soft">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-tight">Probelauf</h3>
              <p className="text-xs text-muted-foreground">
                Heuristiken jetzt einmalig prüfen. Erzeugt nur dann Vorschläge,
                wenn die Regeln sie für gerechtfertigt halten.
              </p>
            </div>
            <Button onClick={evaluateNow} disabled={evaluating} variant="outline">
              <PlayCircle className="h-4 w-4" />
              {evaluating ? "Prüfe …" : "Heuristiken jetzt prüfen"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="fp-card">
          <CardContent className="space-y-3 p-5">
            <h3 className="text-sm font-semibold tracking-tight">Transparenz</h3>
            <p className="text-sm text-muted-foreground">
              Zahlen seit deinem Start. Sie sind kein Belohnungssystem – nur Spiegel
              deiner Entscheidungen.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Gesamt" value={stats.total} />
              <Stat label="Angenommen" value={stats.accepted} tone="positive" />
              <Stat label="Abgelehnt" value={stats.rejected} tone="warning" />
              <Stat label="Vertagt" value={stats.snoozed} tone="info" />
            </div>
          </CardContent>
        </Card>

        <Card className="fp-card-soft">
          <CardContent className="space-y-2 p-5">
            <h3 className="text-sm font-semibold tracking-tight">Prinzipien</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>· Keine adaptive Änderung passiert ohne sichtbare Aktion.</li>
              <li>· Jede Regel kann einzeln deaktiviert werden.</li>
              <li>· Jede Annahme bleibt rückgängig machbar.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "positive" | "warning" | "info";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-rose-600"
        : tone === "info"
          ? "text-amber-600"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function readNumber(v: unknown, fallback: number): number {
  if (typeof v === "number") return v;
  if (typeof v === "object" && v !== null && "value" in v) {
    const inner = (v as { value?: unknown }).value;
    if (typeof inner === "number") return inner;
  }
  return fallback;
}
