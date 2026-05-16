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

const CSV_SHEETS = [
  { sheet: "teilnehmer", label: "CSV Teilnehmer" },
  { sheet: "vorschlaege", label: "CSV Vorschläge" },
  { sheet: "vorschlag_reaktionen", label: "CSV Annahmen/Ablehnungen" },
  { sheet: "interaktionen", label: "CSV Interaktionen" },
] as const;

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
          <p className="text-xs text-muted-foreground">
            Für die Auswertung: <span className="font-medium text-foreground">JSON</span> enthält getrennte Tabellen (
            <span className="font-mono">teilnehmer</span>, <span className="font-mono">vorschlaege</span>,{" "}
            <span className="font-mono">interaktionen</span>). Jede CSV-Datei ist eine Tabelle — Spalte{" "}
            <span className="font-mono">userPseudonym</span> zeigt immer, wer die Zeile betrifft. Bei Vorschlägen:{" "}
            <span className="font-mono">statusLabel</span> (Angenommen/Abgelehnt/Offen/…).
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Gesamtpaket</p>
          <a
            href="/api/data/export-all-users?format=json"
            className="inline-flex"
            target="_blank"
            rel="noreferrer"
          >
            <Button type="button" className="gap-2">
              <Download className="h-4 w-4" />
              JSON (alle Tabellen)
            </Button>
          </a>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Einzelne Tabellen (Excel/SPSS)</p>
          <div className="flex flex-wrap gap-2">
            {CSV_SHEETS.map(({ sheet, label }) => (
              <a
                key={sheet}
                href={`/api/data/export-all-users?format=csv&sheet=${sheet}`}
                className="inline-flex"
                target="_blank"
                rel="noreferrer"
              >
                <Button type="button" variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  {label}
                </Button>
              </a>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Empfehlung: zuerst <span className="font-medium">CSV Vorschläge</span> filtern nach{" "}
          <span className="font-mono">userPseudonym</span> und <span className="font-mono">statusLabel</span>. Für
          Zeitablauf: <span className="font-medium">CSV Interaktionen</span> (sortiert nach Person + Zeit).
        </p>
      </CardContent>
    </Card>
  );
}
