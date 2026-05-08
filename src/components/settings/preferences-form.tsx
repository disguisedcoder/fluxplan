"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { InterventionLevelSlider } from "./intervention-level-slider";
import { DataResetButton } from "./data-reset-button";
import { EventLogExportButton } from "@/components/study/event-log-export-button";
import { DemoSeedButton } from "./demo-seed-button";
import { AdminResetDemoUsersCard } from "./admin-reset-demo-users-card";
import {
  INTERVENTION_LEVELS,
  readInterventionLevel,
  readPreferenceBool,
  clampInterventionLevel,
} from "@/lib/settings/intervention-levels";
import { readTaskFormOptionalFold } from "@/lib/settings/task-form-optional-fold";

type Preferences = Record<string, unknown>;

export function PreferencesForm({ isBaseline }: { isBaseline: boolean }) {
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

  const adaptiveEnabled = readPreferenceBool(prefs["adaptive.enabled"], true);
  const level = readInterventionLevel(prefs["adaptive.interventionLevel"], 2);
  const taskFormFoldOptional = readTaskFormOptionalFold(prefs["taskFormOptionalFold"]);

  return (
    <div className="space-y-4">
      <StudyModeCard
        isBaseline={isBaseline}
        adaptiveEnabled={adaptiveEnabled}
        level={level}
        busy={busy}
        onUpdate={update}
      />

      <Card className="fp-card">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold tracking-tight">Aufgabe anlegen: Zusatzfelder</div>
              <p className="text-xs text-muted-foreground">
                Kategorie, Tags, Dauer, Erinnerung und Beschreibung zunächst einklappen. Ein Klick blendet sie
                wieder ein – unabhängig von adaptiven Vorschlägen.
              </p>
            </div>
            <Switch
              checked={taskFormFoldOptional}
              disabled={busy}
              onCheckedChange={(v) => update("taskFormOptionalFold", { enabled: Boolean(v) })}
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

      <AdminResetDemoUsersCard />

      <Card className="fp-card">
        <CardContent className="space-y-3 p-5">
          <div>
            <div className="text-sm font-semibold tracking-tight">Demo-Setup</div>
            <p className="text-xs text-muted-foreground">
              {isBaseline
                ? "Lädt pro Rolle ein größeres Aufgaben-Set (inkl. Konflikte/Beispiele). Vorschläge bleiben in der Baseline deaktiviert."
                : "Lädt pro Rolle ein größeres Aufgaben-Set (inkl. Konflikte/Trigger) und bereitet Vorschläge für die adaptive Variante vor."}
            </p>
          </div>
          <DemoSeedButton onDone={load} />
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

function StudyModeCard({
  isBaseline,
  adaptiveEnabled,
  level,
  busy,
  onUpdate,
}: {
  isBaseline: boolean;
  adaptiveEnabled: boolean;
  level: number;
  busy: boolean;
  onUpdate: (key: string, value: unknown) => Promise<void>;
}) {
  if (isBaseline) {
    return (
      <Card className="fp-card">
        <CardContent className="space-y-3 p-5">
          <div>
            <div className="text-sm font-semibold tracking-tight">Studienmodus: Baseline</div>
            <p className="text-xs text-muted-foreground">
              In der Baseline nutzt du FluxPlan als normale Aufgaben- und Planungs-App. Vorschläge und Anpassungen sind
              deaktiviert.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            Wenn du später bewusst zu <span className="font-medium text-foreground">Adaptive</span> wechselst, bleiben
            deine Aufgaben erhalten. Starte dafür oben im Session-Bereich eine neue Session mit derselben Kennung und
            wähle <span className="font-medium text-foreground">Adaptive</span>.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fp-card">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold tracking-tight">Vorschläge</div>
            <p className="text-xs text-muted-foreground">
              Master-Schalter. Wenn aus, erscheinen keine Vorschläge und kein Banner. Der Verlauf bleibt sichtbar.
            </p>
          </div>
          <Switch
            checked={adaptiveEnabled}
            disabled={busy}
            onCheckedChange={(v) => onUpdate("adaptive.enabled", Boolean(v))}
          />
        </div>

        <div className="space-y-2 border-t border-border/60 pt-4">
          <div className="text-sm font-semibold tracking-tight">Eingriffsstufe</div>
          <p className="text-xs text-muted-foreground">
            Steuert, wie klar ein Muster sein muss, bevor FluxPlan einen Vorschlag macht. „Aus“ unterbindet neue
            Vorschläge.
          </p>
          <InterventionLevelSlider
            value={level}
            levels={[...INTERVENTION_LEVELS]}
            disabled={busy || !adaptiveEnabled}
            onChange={(v) => onUpdate("adaptive.interventionLevel", clampInterventionLevel(v))}
          />
        </div>
      </CardContent>
    </Card>
  );
}

