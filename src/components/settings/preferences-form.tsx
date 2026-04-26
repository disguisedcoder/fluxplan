"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { InterventionLevelSlider } from "./intervention-level-slider";
import { DataResetButton } from "./data-reset-button";
import { EventLogExportButton } from "@/components/study/event-log-export-button";

const LEVELS = [
  { value: 0, label: "Aus", desc: "Keine adaptiven Vorschläge." },
  { value: 1, label: "Leise", desc: "Nur sehr seltene, eindeutige Vorschläge." },
  { value: 2, label: "Aktiv", desc: "Standard. Vorschläge bei klaren Mustern." },
  { value: 3, label: "Eng", desc: "Häufiger, alle bleiben erklärbar und reversibel." },
];

type Preferences = Record<string, unknown>;

export function PreferencesForm() {
  const [prefs, setPrefs] = useState<Preferences>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/preferences", { cache: "no-store" });
    if (!r.ok) return;
    const data = await r.json();
    setPrefs(data.preferences ?? {});
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function update(key: string, value: unknown) {
    setBusy(true);
    try {
      const res = await fetch("/api/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        toast.error("Konnte nicht speichern.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  const adaptiveEnabled = readBool(prefs["adaptive.enabled"], true);
  const level = readNumber(prefs["adaptive.interventionLevel"], 2);

  return (
    <div className="space-y-4">
      <Card className="fp-card">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold tracking-tight">Adaptive Vorschläge</div>
              <p className="text-xs text-muted-foreground">
                Master-Schalter. Wenn aus, erscheinen keine Vorschlagskarten und kein
                Banner. Verlauf bleibt sichtbar.
              </p>
            </div>
            <Switch
              checked={adaptiveEnabled}
              disabled={busy}
              onCheckedChange={(v) => update("adaptive.enabled", Boolean(v))}
            />
          </div>

          <div className="space-y-2 border-t border-border/60 pt-4">
            <div className="text-sm font-semibold tracking-tight">Eingriffsstufe</div>
            <p className="text-xs text-muted-foreground">
              Bestimmt, wie schnell ein Vorschlag erscheint. „Aus“ deaktiviert ihn vollständig.
            </p>
            <InterventionLevelSlider
              value={level}
              levels={LEVELS}
              disabled={busy || !adaptiveEnabled}
              onChange={(v) => update("adaptive.interventionLevel", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="fp-card">
        <CardContent className="space-y-3 p-5">
          <div>
            <div className="text-sm font-semibold tracking-tight">Daten exportieren</div>
            <p className="text-xs text-muted-foreground">
              Pseudonymisierte Daten als JSON oder CSV. Auswertung erfolgt offline.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <EventLogExportButton format="json" />
            <EventLogExportButton format="csv" />
          </div>
        </CardContent>
      </Card>

      <Card className="fp-card border-destructive/30 bg-destructive/[0.04]">
        <CardContent className="space-y-3 p-5">
          <div>
            <div className="text-sm font-semibold tracking-tight">Daten zurücksetzen</div>
            <p className="text-xs text-muted-foreground">
              Löscht Aufgaben, Interaktionen, Vorschläge und Einstellungen. Pseudonym
              und aktive Session bleiben.
            </p>
          </div>
          <DataResetButton onDone={load} />
        </CardContent>
      </Card>
    </div>
  );
}

function readBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "object" && v !== null && "value" in v) {
    const inner = (v as { value?: unknown }).value;
    if (typeof inner === "boolean") return inner;
  }
  return fallback;
}

function readNumber(v: unknown, fallback: number): number {
  if (typeof v === "number") return v;
  if (typeof v === "object" && v !== null && "value" in v) {
    const inner = (v as { value?: unknown }).value;
    if (typeof inner === "number") return inner;
  }
  return fallback;
}
