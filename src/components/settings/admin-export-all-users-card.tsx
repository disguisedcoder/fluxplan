"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { studyApiFetch } from "@/lib/http/study-api-fetch";

type Me = {
  user: { pseudonym: string } | null;
  canManageStudyData?: boolean;
};

export function AdminExportAllUsersCard() {
  const [me, setMe] = useState<Me | null>(null);

  const load = useCallback(async () => {
    const r = await studyApiFetch("/api/me", { cache: "no-store" });
    if (!r.ok) return;
    setMe((await r.json()) as Me);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => {});
  }, [load]);

  if (!me?.canManageStudyData) return null;

  return (
    <Card className="fp-card">
      <CardContent className="space-y-4 p-5">
        <div>
          <div className="text-sm font-semibold tracking-tight">Studie: Alle Teilnehmer exportieren</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Für Fragebogen und Auswertung: eine Datei mit getrennten Tabellen (Teilnehmer, Vorschläge, Reaktionen,
            Interaktionen). Spalte <span className="font-mono">userPseudonym</span> verknüpft alles; bei Vorschlägen{" "}
            <span className="font-mono">statusLabel</span> (Angenommen, Abgelehnt, Offen, …).
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Empfohlen</p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/data/export-all-users?format=xlsx"
              className="inline-flex"
              target="_blank"
              rel="noreferrer"
            >
              <Button type="button" className="gap-2">
                <Download className="h-4 w-4" />
                Excel — alle Tabellen (eine Datei)
              </Button>
            </a>
            <a
              href="/api/data/export-all-users?format=json&profile=auswertung&pretty=true"
              className="inline-flex"
              target="_blank"
              rel="noreferrer"
            >
              <Button type="button" variant="secondary" className="gap-2">
                <Download className="h-4 w-4" />
                JSON — Auswertung (lesbar)
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Excel</span>: Tabs wie die früheren CSVs (Teilnehmer,
            Vorschläge, Annahmen/Ablehnungen, Interaktionen, Sessions) + README.{" "}
            <span className="font-medium text-foreground">JSON Auswertung</span>: dieselben Tabellen als Arrays (
            <span className="font-mono">teilnehmer</span>, <span className="font-mono">vorschlaege</span>, …), ohne
            Rohdatenblock — gut zum Durchsuchen und für den Fragebogen.
          </p>
        </div>

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Erweitert: Einzeltabellen & Voll-JSON</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href="/api/data/export-all-users?format=csv&sheet=teilnehmer"
              className="inline-flex"
              target="_blank"
              rel="noreferrer"
            >
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                CSV Teilnehmer
              </Button>
            </a>
            <a
              href="/api/data/export-all-users?format=csv&sheet=vorschlaege"
              className="inline-flex"
              target="_blank"
              rel="noreferrer"
            >
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                CSV Vorschläge
              </Button>
            </a>
            <a
              href="/api/data/export-all-users?format=csv&sheet=vorschlag_reaktionen"
              className="inline-flex"
              target="_blank"
              rel="noreferrer"
            >
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                CSV Reaktionen
              </Button>
            </a>
            <a
              href="/api/data/export-all-users?format=csv&sheet=interaktionen"
              className="inline-flex"
              target="_blank"
              rel="noreferrer"
            >
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                CSV Interaktionen
              </Button>
            </a>
            <a
              href="/api/data/export-all-users?format=json"
              className="inline-flex"
              target="_blank"
              rel="noreferrer"
            >
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                JSON vollständig
              </Button>
            </a>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
