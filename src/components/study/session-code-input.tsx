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
import { studyApiFetch } from "@/lib/http/study-api-fetch";
import { dispatchStudyMeChanged } from "@/lib/study/me-invalidate";
import { cn } from "@/lib/utils";

type MeResponse = {
  user: { id: string; pseudonym: string; studyModeEnabled: boolean } | null;
  session: { id: string; sessionCode: string; startedAt: string; variant?: string | null } | null;
  canManageStudyData?: boolean;
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
  const [missingInfo, setMissingInfo] = useState<null | "variant" | "userCode">(null);

  /** User- oder Session-Wechsel soll erneut aus Server-Prefs lesen (nicht nur einmal pro userId). */
  const lastPrefsSyncKeyRef = useRef<string | null>(null);

  const normalized = useMemo(() => pseudonym.trim(), [pseudonym]);

  function reloadMe() {
    studyApiFetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setMe(data))
      .catch(() => setMe({ user: null, session: null }));
  }

  useEffect(() => {
    let cancelled = false;
    studyApiFetch("/api/me", { cache: "no-store" })
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

    void studyApiFetch("/api/preferences", { cache: "no-store" })
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
    if (submitting) return;
    const nextVariant = variantDialog === "baseline" ? "baseline" : variantDialog === "adaptive" ? "adaptive" : null;
    if (!nextVariant) return;

    const nextLevel = nextVariant === "adaptive" ? clampInterventionLevel(draftLevel) : interventionLevel;

    if (nextVariant === "baseline") {
      setVariant("baseline");
    } else {
      setVariant("adaptive");
      setInterventionLevel(nextLevel);
    }
    setVariantConfirmed(true);
    setVariantDialog(null);

    if (me?.session) {
      void persistSessionVariant(nextVariant, nextVariant === "adaptive" ? nextLevel : undefined);
    }
  }

  async function persistSessionVariant(nextVariant: "baseline" | "adaptive", level?: number) {
    setSubmitting(true);
    try {
      const res = await studyApiFetch("/api/study/session", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          variant: nextVariant,
          interventionLevel: nextVariant === "adaptive" ? level : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error("Studienvariante konnte nicht gespeichert werden.", {
          description: body?.error ?? "Bitte erneut versuchen.",
        });
        return;
      }
      toast.success(
        nextVariant === "adaptive" ? "Adaptive Variante ist jetzt aktiv." : "Baseline ist jetzt aktiv.",
        { description: "Einstellung bleibt nach einem Reload erhalten." },
      );
      reloadMe();
      dispatchStudyMeChanged();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function startSession() {
    if (!variantConfirmed) {
      setMissingInfo("variant");
      return;
    }
    if (!normalized) {
      setMissingInfo("userCode");
      return;
    }
    setSubmitting(true);
    try {
      const res = await studyApiFetch("/api/study/session", {
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
        description: `User-Code: ${normalized}`,
      });
      dispatchStudyMeChanged();
      router.push("/start");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function startGuest() {
    if (submitting) return;
    if (!variantConfirmed) {
      setMissingInfo("variant");
      return;
    }
    setSubmitting(true);
    try {
      const res = await studyApiFetch("/api/study/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          guest: true,
          variant,
          interventionLevel: variant === "adaptive" ? interventionLevel : undefined,
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { user?: { pseudonym?: string }; error?: string }
        | null;
      if (!res.ok) {
        const err = payload && "error" in payload ? payload.error : undefined;
        const msg = payload && "message" in payload && typeof (payload as { message?: string }).message === "string"
          ? (payload as { message: string }).message
          : undefined;
        toast.error(
          err === "guest_slots_full" ? "Kein freier Gast-Code (G01/G02)." : "Gast-Session konnte nicht gestartet werden.",
          {
            description: msg ?? err ?? "Ungültige Eingabe oder Serverfehler.",
          },
        );
        return;
      }
      const assigned = payload?.user?.pseudonym ?? "Gast";
      toast.success("Gast-Session gestartet.", {
        description: `Vergabener User-Code: ${assigned}`,
      });
      dispatchStudyMeChanged();
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
            <span className="font-medium text-foreground">User-Code</span> frei wählen (z. B. Testperson{" "}
            <span className="font-medium">F01</span> oder <span className="font-medium">P01</span>) — oder ohne Eingabe
            als <span className="font-medium">Gast</span> starten. Keine echten Namen, keine Passwörter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {me?.user ? (
            <div className="text-sm text-muted-foreground">
              Aktuell aktiv — User: <span className="font-medium text-foreground">{me.user.pseudonym}</span>
              {me.session ? (
                <>
                  {" "}
                  · Session: <span className="font-medium text-foreground">{me.session.sessionCode}</span>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2">
            <div className="text-sm font-medium">User - Code</div>
            <Input
              value={pseudonym}
              onChange={(e) => setPseudonym(e.target.value)}
              placeholder="z. B. P01"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <div className="text-xs text-muted-foreground">
              Für <span className="font-medium text-foreground">Session starten</span> nötig. Bei{" "}
              <span className="font-medium text-foreground">Als Gast starten</span> entfällt der User-Code — der Server
              vergibt nacheinander <span className="font-mono">G01</span>, <span className="font-mono">G02</span> (max.
              zwei Gast-Konten; danach bitte eigenen Code nutzen). Erlaubt bei eigenem Code: Buchstaben/Zahlen
              sowie <span className="font-mono">_</span> und{" "}
              <span className="font-mono">-</span>.
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Studienvariante</div>
            <p className="text-xs text-muted-foreground">
              Nach dem Bestätigen im Dialog wird die Variante in der aktiven Session gespeichert (inkl. nach einem
              Seiten-Reload). Ohne laufende Session gilt die Wahl beim Klick auf{" "}
              <span className="font-medium text-foreground">Session starten</span>.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className={cn("w-full", variant === "baseline" && "border-primary/40 bg-primary/10 text-primary")}
                onClick={() => openVariantDialog("baseline")}
                aria-pressed={variant === "baseline"}
              >
                Baseline
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn("w-full", variant === "adaptive" && "border-primary/40 bg-primary/10 text-primary")}
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

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {me?.user ? <SessionLogoutButton onDone={reloadMe} /> : null}
            <Button className="w-full sm:w-auto" onClick={startSession} disabled={submitting}>
              Session starten
            </Button>
            {allowGuest ? (
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={startGuest}
                disabled={submitting || !variantConfirmed}
              >
                Als Gast starten
              </Button>
            ) : null}
            {me?.user ? (
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.push("/start")}>
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
        <DialogContent className="p-5 sm:max-w-lg sm:p-6" showCloseButton>
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
              <DialogFooter showCloseButton={false} className="border-t-0 bg-transparent p-0 pt-4 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setVariantDialog(null)}>
                  Abbrechen
                </Button>
                <Button type="button" onClick={confirmVariantDialog} disabled={submitting}>
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
              <div className="rounded-xl border border-border/60 bg-card/60 p-4">
                <InterventionLevelSlider
                  value={draftLevel}
                  levels={[...INTERVENTION_LEVELS]}
                  onChange={(v) => setDraftLevel(clampInterventionLevel(v))}
                />
              </div>
              <DialogFooter showCloseButton={false} className="border-t-0 bg-transparent p-0 pt-4 sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setVariantDialog(null)}>
                  Abbrechen
                </Button>
                <Button type="button" onClick={confirmVariantDialog} disabled={submitting}>
                  Adaptive übernehmen
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={missingInfo !== null}
        onOpenChange={(open) => {
          if (!open) setMissingInfo(null);
        }}
      >
        <DialogContent className="p-5 sm:max-w-md sm:p-6" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {missingInfo === "variant" ? "Studienvariante fehlt" : "User-Code fehlt"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {missingInfo === "variant" ? (
                <>
                  Bitte wähle <span className="font-medium text-foreground">Baseline</span> oder{" "}
                  <span className="font-medium text-foreground">Adaptive</span> und bestätige die Auswahl im Dialog —
                  erst danach kann die Session starten.
                </>
              ) : (
                <>
                  Bitte gib einen <span className="font-medium text-foreground">User-Code</span> ein (z. B. P01), oder
                  nutze <span className="font-medium text-foreground">Als Gast starten</span>, wenn verfügbar.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false} className="border-t-0 bg-transparent p-0 pt-4 sm:justify-end">
            <Button type="button" onClick={() => setMissingInfo(null)}>
              Verstanden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function levelHint(level: number): string {
  const row = INTERVENTION_LEVELS.find((l) => l.value === level);
  return row?.label ?? String(level);
}
