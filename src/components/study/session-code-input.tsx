"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type MeResponse = {
  user: { id: string; pseudonym: string; studyModeEnabled: boolean } | null;
  session: { id: string; sessionCode: string; startedAt: string; variant?: string | null } | null;
};

export function SessionCodeInput() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [pseudonym, setPseudonym] = useState("");
  const [variant, setVariant] = useState<"baseline" | "adaptive">("adaptive");
  const [submitting, setSubmitting] = useState(false);

  const normalized = useMemo(() => pseudonym.trim(), [pseudonym]);

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

  async function startSession() {
    if (!normalized) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/study/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pseudonym: normalized, variant }),
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
      router.push("/heute");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Study Session</CardTitle>
        <CardDescription>
          Für die Evaluation nutzt FluxPlan einen Pseudonym-Code (z.B. <span className="font-medium">P01</span>). Keine
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
            Erlaubt: Buchstaben/Zahlen sowie <span className="font-mono">_</span> und <span className="font-mono">-</span>.
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Variante</div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={variant === "baseline" ? "default" : "outline"}
              onClick={() => setVariant("baseline")}
            >
              Baseline
            </Button>
            <Button
              type="button"
              variant={variant === "adaptive" ? "default" : "outline"}
              onClick={() => setVariant("adaptive")}
            >
              Adaptive
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={startSession} disabled={!normalized || submitting}>
            Session starten
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/heute")}>
            Zur App
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

