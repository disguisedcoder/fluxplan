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
import {
  INTERVENTION_LEVELS,
  readInterventionLevel,
  readPreferenceBool,
  clampInterventionLevel,
} from "@/lib/settings/intervention-levels";

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
  const [levelBusy, setLevelBusy] = useState(false);
  const adaptiveEnabled = readPreferenceBool(preferences["adaptive.enabled"], true);
  const interventionLevel = readInterventionLevel(preferences["adaptive.interventionLevel"], 2);

  async function evaluateNow() {
    setEvaluating(true);
    try {
      const res = await fetch("/api/adaptive/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ screen: "/anpassungen", metadata: { trigger: "manual" } }),
      });
      if (!res.ok) {
        toast.error("Konnte Vorschläge nicht prüfen.");
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
    const clamped = clampInterventionLevel(value);
    setLevelBusy(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: "adaptive.interventionLevel", value: clamped }),
      });
      if (!res.ok) {
        toast.error("Konnte Eingriffsstufe nicht speichern.");
        return;
      }
      onChanged();
    } finally {
      setLevelBusy(false);
    }
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
                Gleiche Einstellung wie unter Einstellungen. Wenn „Vorschläge“ dort
                aus ist, sind hier keine Änderungen möglich.
              </p>
            </div>
            <InterventionLevelSlider
              value={interventionLevel}
              levels={[...INTERVENTION_LEVELS]}
              disabled={levelBusy || !adaptiveEnabled}
              onChange={setLevel}
            />
          </CardContent>
        </Card>

        <Card className="fp-card-soft">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-tight">Probelauf</h3>
              <p className="text-xs text-muted-foreground">
                Vorschläge jetzt einmalig prüfen. Es werden nur dann Vorschläge erstellt,
                wenn genügend klare Muster erkennbar sind.
              </p>
            </div>
            <Button onClick={evaluateNow} disabled={evaluating} variant="outline">
              <PlayCircle className="h-4 w-4" />
              {evaluating ? "Prüfe …" : "Jetzt prüfen"}
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

