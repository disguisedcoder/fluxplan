"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { studyApiFetch } from "@/lib/http/study-api-fetch";
import { STUDY_ME_CHANGED_EVENT } from "@/lib/study/me-invalidate";
import { isGuestStudyPseudonym } from "@/lib/demo/guest-study";
import { isDemoTestPseudonym } from "@/lib/demo";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { InterventionLevelSlider } from "./intervention-level-slider";
import { DataResetButton } from "./data-reset-button";
import { EventLogExportButton } from "@/components/study/event-log-export-button";
import { DemoSeedButton } from "./demo-seed-button";
import { AdminResetDemoUsersCard } from "./admin-reset-demo-users-card";
import { AdminResetGuestUsersCard } from "./admin-reset-guest-users-card";
import {
  INTERVENTION_LEVELS,
  readInterventionLevel,
  readPreferenceBool,
  clampInterventionLevel,
} from "@/lib/settings/intervention-levels";
type Preferences = Record<string, unknown>;

export function PreferencesForm({ isBaseline: serverBaseline }: { isBaseline: boolean }) {
  const [prefs, setPrefs] = useState<Preferences>({});
  const [busy, setBusy] = useState(false);
  const [isBaseline, setIsBaseline] = useState(serverBaseline);
  const [showDemoSetupCard, setShowDemoSetupCard] = useState(false);

  const load = useCallback(async () => {
    const r = await studyApiFetch("/api/preferences", { cache: "no-store" });
    if (!r.ok) return;
    const data = await r.json();
    setPrefs(data.preferences ?? {});
  }, []);

  const refreshDemoSetupVisibility = useCallback(async () => {
    const r = await studyApiFetch("/api/me", { cache: "no-store" });
    if (!r.ok) {
      setShowDemoSetupCard(false);
      return;
    }
    const d = (await r.json()) as { user?: { pseudonym?: string } | null };
    const p = d.user?.pseudonym;
    setShowDemoSetupCard(isGuestStudyPseudonym(p) || isDemoTestPseudonym(p));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshDemoSetupVisibility();
  }, [refreshDemoSetupVisibility]);

  useEffect(() => {
    const onMe = () => void refreshDemoSetupVisibility();
    window.addEventListener(STUDY_ME_CHANGED_EVENT, onMe);
    return () => window.removeEventListener(STUDY_ME_CHANGED_EVENT, onMe);
  }, [refreshDemoSetupVisibility]);

  useEffect(() => {
    queueMicrotask(() => setIsBaseline(serverBaseline));
  }, [serverBaseline]);

  useEffect(() => {
    function syncSessionVariant() {
      void studyApiFetch("/api/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { session?: { variant?: string | null } | null }) => {
          setIsBaseline(d.session?.variant === "baseline");
        })
        .catch(() => {});
    }
    window.addEventListener(STUDY_ME_CHANGED_EVENT, syncSessionVariant);
    return () => window.removeEventListener(STUDY_ME_CHANGED_EVENT, syncSessionVariant);
  }, []);

  async function update(key: string, value: unknown) {
    setBusy(true);
    try {
      const res = await studyApiFetch("/api/preferences", {
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
          <div>
            <div className="text-sm font-semibold tracking-tight">Aufgabe anlegen: Zusatzfelder</div>
            {isBaseline ? (
              <p className="text-xs text-muted-foreground">
                In der <span className="font-medium text-foreground">Baseline</span> gibt es keine adaptiven
                Vorschläge. Sobald du in den Einstellungen zur{" "}
                <span className="font-medium text-foreground">adaptiven Variante</span> wechselst, gelten dieselben
                Regeln wie für andere Features: Unter <span className="font-medium text-foreground">Anpassungen</span>{" "}
                kann FluxPlan ein kompakteres Formular vorschlagen — mit{" "}
                <span className="font-medium text-foreground">Annehmen</span>,{" "}
                <span className="font-medium text-foreground">Nicht jetzt</span> und{" "}
                <span className="font-medium text-foreground">Ablehnen</span>.{" "}
                <span className="font-medium text-foreground">Weitere Felder</span> klappen den Bereich jederzeit
                wieder auf.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ob die Zusatzfelder (Kategorie, Tags, Dauer, Erinnerung, Beschreibung) beim Anlegen zunächst
                eingeklappt sind, steuert dieselbe adaptive Logik wie andere Vorschläge: Unter{" "}
                <span className="font-medium text-foreground">Anpassungen</span> schlagen die Regeln{" "}
                <span className="font-medium text-foreground">Formular: Zusatzfelder einklappen</span> bzw.{" "}
                <span className="font-medium text-foreground">… wieder ausklappen</span> vor — mit{" "}
                <span className="font-medium text-foreground">Annehmen</span>,{" "}
                <span className="font-medium text-foreground">Nicht jetzt</span> und{" "}
                <span className="font-medium text-foreground">Ablehnen</span> (plus{" "}
                <span className="font-medium text-foreground">Rückgängig</span> nach Annahme im Verlauf). Nach
                Annahme des Einklapp-Vorschlags ist der Bereich zunächst zu;{" "}
                <span className="font-medium text-foreground">Weitere Felder</span> blendet ihn jederzeit wieder ein,
                ohne dass du den Vorschlag erneut annehmen musst.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="fp-card">
        <CardContent className="space-y-3 p-5">
          <div>
            <div className="text-sm font-semibold tracking-tight">Daten exportieren</div>
            <p className="text-xs text-muted-foreground">
              Anonymisierte Studiendaten als JSON oder CSV. Auswertung erfolgt offline.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <EventLogExportButton format="json" />
            <EventLogExportButton format="csv" />
          </div>
        </CardContent>
      </Card>

      <AdminResetDemoUsersCard />
      <AdminResetGuestUsersCard />

      {showDemoSetupCard ? (
        <Card className="fp-card">
          <CardContent className="space-y-3 p-5">
            <div>
              <div className="text-sm font-semibold tracking-tight">Demo-Setup (Gast G01 / G02 oder Codes F01–E05)</div>
              <p className="text-xs text-muted-foreground">
                {isBaseline
                  ? "Lädt die rollenspezifische Demo (F = Familienplanner, T = Taskplanner, E = Eval-Runner): Aufgaben-Set inkl. Beispielen. Vorschläge bleiben in der Baseline deaktiviert."
                  : "Lädt bzw. ersetzt die Session durch die rollenspezifische Demo inkl. Workshop-Präferenzen und adaptiven Beispielen (wie nach „Daten zurücksetzen“ bei Demo-Codes)."}
              </p>
            </div>
            <DemoSeedButton onDone={load} />
          </CardContent>
        </Card>
      ) : null}

      <Card className="fp-card border-destructive/30 bg-destructive/[0.04]">
        <CardContent className="space-y-3 p-5">
          <div>
            <div className="text-sm font-semibold tracking-tight">Daten zurücksetzen</div>
            <p className="text-xs text-muted-foreground">
              Leert die App-Daten der aktuellen Studien-Session (Aufgaben, Vorschläge,
              Nutzungsprotokoll dieser Session). Einstellungen und andere Teilnehmende
              bleiben unberührt.
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
            Zum Wechsel zu <span className="font-medium text-foreground">Adaptive</span> oben im Bereich{" "}
            <span className="font-medium text-foreground">Study Session</span> auf{" "}
            <span className="font-medium text-foreground">Adaptive</span> tippen, im Dialog bestätigen — die Variante
            wird in der laufenden Session gespeichert (auch nach einem Reload). Deine Aufgaben bleiben erhalten.
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

