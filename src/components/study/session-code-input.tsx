"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { InterventionLevelSlider } from "@/components/settings/intervention-level-slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SessionLogoutButton } from "@/components/study/session-logout-button";
import {
  INTERVENTION_LEVELS,
  clampInterventionLevel,
  readInterventionLevel,
  readPreferenceBool,
} from "@/lib/settings/intervention-levels";

type MeResponse = {
  user: { id: string; pseudonym: string; studyModeEnabled: boolean } | null;
  session: { id: string; sessionCode: string; startedAt: string; variant?: string | null } | null;
  isAdmin?: boolean;
};

export function SessionCodeInput({ allowGuest = false }: { allowGuest?: boolean }) {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [pseudonym, setPseudonym] = useState("");
  const [variant, setVariant] = useState<"baseline" | "adaptive">("adaptive");
  const [interventionLevel, setInterventionLevel] = useState(2);
  const [variantDialog, setVariantDialog] = useState<null | "baseline" | "adaptive">(null);
  const [draftLevel, setDraftLevel] = useState(2);
  const [variantConfirmed, setVariantConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /** User- oder Session-Wechsel soll erneut aus Server-Prefs lesen (nicht nur einmal pro userId). */
  const lastPrefsSyncKeyRef = useRef<string | null>(null);

  const normalized = useMemo(() => pseudonym.trim(), [pseudonym]);

  function reloadMe() {
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setMe(data))
      .catch(() => setMe({ user: null, session: null }));
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: MeResponse) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe({ user: null, session: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const prefsSyncKey = me?.user?.id
    ? `${me.user.id}:${me.session?.sessionCode ?? ""}:${me.session?.variant ?? ""}`
    : null;

  useEffect(() => {
    if (!me?.user?.id || !prefsSyncKey) {
      lastPrefsSyncKeyRef.current = null;
      queueMicrotask(() => setVariantConfirmed(false));
      return;
    }

    if (lastPrefsSyncKeyRef.current === prefsSyncKey) return;
    lastPrefsSyncKeyRef.current = prefsSyncKey;

    const sessionVar = me.session?.variant;

    void fetch("/api/preferences", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { preferences?: Record<string, unknown> }) => {
        const prefs = d.preferences ?? {};
        setInterventionLevel(readInterventionLevel(prefs["adaptive.interventionLevel"], 2));
        if (sessionVar === "baseline" || sessionVar === "adaptive") {
          setVariant(sessionVar);
        } else {
          const en = readPreferenceBool(prefs["adaptive.enabled"], true);
          setVariant(en ? "adaptive" : "baseline");
        }
        setVariantConfirmed(true);
      })
      .catch(() => {
        setVariantConfirmed(true);
      });
  }, [me?.user?.id, me?.session?.sessionCode, me?.session?.variant, prefsSyncKey]);

  function openVariantDialog(next: "baseline" | "adaptive") {
    if (next === "adaptive") {
      setDraftLevel(interventionLevel);
    }
    setVariantDialog(next);
  }

  function confirmVariantDialog() {
    if (variantDialog === "baseline") {
      setVariant("baseline");
    } else if (variantDialog === "adaptive") {
      setVariant("adaptive");
      setInterventionLevel(clampInterventionLevel(draftLevel));
    }
    setVariantConfirmed(true);
    setVariantDialog(null);
  }

  async function startSession() {
    if (!normalized || !variantConfirmed) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/study/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pseudonym: normalized,
          variant,
          interventionLevel: variant === "adaptive" ? interventionLevel : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error("Session konnte nicht gestartet werden.", {
          description: body?.error ?? "Ungültige Eingabe oder Serverfehler.",
        });
        return;
      }
      toast.success("Study Session gestartet.", {
        description: `Pseudonym: ${normalized}`,
      });
      router.push("/start");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function startGuest() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/study/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pseudonym: "G01",
          variant: "adaptive",
          interventionLevel: 2,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error("Gast-Session konnte nicht gestartet werden.", {
          description: body?.error ?? "Ungültige Eingabe oder Serverfehler.",
        });
        return;
      }
      toast.success("Gast-Session gestartet.", {
        description: "Pseudonym: G01",
      });
      router.push("/start");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Study Session</CardTitle>
          <CardDescription>
            Pseudonym frei wählen (z. B. Testperson <span className="font-medium">F01</span>, Admin{" "}
            <span className="font-medium">admin</span>). Groß-/Kleinschreibung egal für die Admin-Freigabe. Keine
            Passwörter, keine personenbezogenen Daten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {me?.user ? (
            <div className="text-sm text-muted-foreground">
              Aktuell aktiv: <span className="font-medium text-foreground">{me.user.pseudonym}</span>
              {me.session ? (
                <>
                  {" "}
                  · Session: <span className="font-medium text-foreground">{me.session.sessionCode}</span>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2">
            <div className="text-sm font-medium">Pseudonym-Code</div>
            <Input
              value={pseudonym}
              onChange={(e) => setPseudonym(e.target.value)}
              placeholder="z.B. P01"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <div className="text-xs text-muted-foreground">
              Erlaubt: Buchstaben/Zahlen sowie <span className="font-mono">_</span> und{" "}
              <span className="font-mono">-</span>.
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Studienvariante</div>
            <p className="text-xs text-muted-foreground">
              Wird beim Session-Start als Einstellung übernommen. Zum Wechseln jeweils antippen und im Dialog
              bestätigen.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className={variant === "baseline" ? "border-primary/40 bg-primary/10 text-primary" : undefined}
                onClick={() => openVariantDialog("baseline")}
                aria-pressed={variant === "baseline"}
              >
                Baseline
              </Button>
              <Button
                type="button"
                variant="outline"
                className={variant === "adaptive" ? "border-primary/40 bg-primary/10 text-primary" : undefined}
                onClick={() => openVariantDialog("adaptive")}
                aria-pressed={variant === "adaptive"}
              >
                Adaptive
              </Button>
            </div>
            {variantConfirmed ? (
              <p className="text-xs text-muted-foreground">
                Aktuell:{" "}
                <span className="font-medium text-foreground">
                  {variant === "baseline"
                    ? "Baseline (keine Adaptivität)"
                    : `Adaptive · Eingriffsstufe ${interventionLevel} (${levelHint(interventionLevel)})`}
                </span>
              </p>
            ) : (
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Bitte Baseline oder Adaptive wählen und im Dialog bestätigen, bevor du die Session startest.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {me?.user ? <SessionLogoutButton onDone={reloadMe} /> : null}
            <Button onClick={startSession} disabled={!normalized || !variantConfirmed || submitting}>
              Session starten
            </Button>
            {allowGuest ? (
              <Button type="button" variant="outline" onClick={startGuest} disabled={submitting}>
                Als Gast starten
              </Button>
            ) : null}
            {me?.user ? (
              <Button type="button" variant="outline" onClick={() => router.push("/start")}>
                Zur App
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={variantDialog !== null}
        onOpenChange={(open) => {
          if (!open) setVariantDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          {variantDialog === "baseline" ? (
            <>
              <DialogHeader>
                <DialogTitle>Baseline bestätigen</DialogTitle>
                <DialogDescription className="space-y-2 text-sm text-muted-foreground">
                  <span className="block">
                    Es gibt <span className="font-medium text-foreground">keine adaptiven Vorschläge</span> und{" "}
                    <span className="font-medium text-foreground">keine Hinweis-Banner</span> in der App. Aufgaben,
                    Kalender und manuelle Aktionen bleiben unverändert.
                  </span>
                  <span className="block">
                    In den Einstellungen wird dafür der Schalter{" "}
                    <span className="font-medium text-foreground">Vorschläge aus</span> gesetzt (Master-Schalter).
                  </span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton={false} className="border-t-0 bg-transparent p-0 pt-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setVariantDialog(null)}>
                  Abbrechen
                </Button>
                <Button type="button" onClick={confirmVariantDialog}>
                  Baseline übernehmen
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {variantDialog === "adaptive" ? (
            <>
              <DialogHeader>
                <DialogTitle>Adaptive Variante bestätigen</DialogTitle>
                <DialogDescription className="space-y-2 text-sm text-muted-foreground">
                  <span className="block">
                    Vorschläge und Hinweise sind erlaubt. Lege die{" "}
                    <span className="font-medium text-foreground">Eingriffsstufe</span> fest; sie bestimmt, wie klar
                    ein Muster sein muss, bevor FluxPlan etwas vorschlägt.
                  </span>
                  <span className="block">
                    Beim Start werden <span className="font-medium text-foreground">Vorschläge an</span> und
                    diese Stufe in den Einstellungen gespeichert.
                  </span>
                </DialogDescription>
              </DialogHeader>
              <InterventionLevelSlider
                value={draftLevel}
                levels={[...INTERVENTION_LEVELS]}
                onChange={(v) => setDraftLevel(clampInterventionLevel(v))}
              />
              <DialogFooter showCloseButton={false} className="border-t-0 bg-transparent p-0 pt-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setVariantDialog(null)}>
                  Abbrechen
                </Button>
                <Button type="button" onClick={confirmVariantDialog}>
                  Adaptive übernehmen
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function levelHint(level: number): string {
  const row = INTERVENTION_LEVELS.find((l) => l.value === level);
  return row?.label ?? String(level);
}
