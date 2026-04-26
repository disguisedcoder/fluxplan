"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type Insights = {
  window: { days: number };
  tasks: {
    createdLast7d: number;
    completedLast7d: number;
    withDueDatePct: number;
    withReminderPct: number;
  };
  suggestions: { pending: number; responded: number };
  engine: { lastEvaluatedAt: string | null };
};

export function TransparencyPanel() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/insights", { cache: "no-store" });
        const j = (await res.json()) as Insights;
        if (!cancelled) setData(j);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="fp-card-soft">
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Eye className="h-4 w-4 text-muted-foreground" />
          Was die Engine gerade weiß
        </div>
        <p className="text-xs text-muted-foreground">
          Nur die folgenden Zahlen aus deinen letzten 7 Tagen fließen in die Heuristiken
          ein. Keine externen Daten, keine Profilanalyse.
        </p>

        {loading || !data ? (
          <div className="text-sm text-muted-foreground">Lade …</div>
        ) : (
          <ul className="grid gap-2 pt-1 text-sm sm:grid-cols-2">
            <li>
              <span className="font-medium tabular-nums">{data.tasks.createdLast7d}</span>{" "}
              <span className="text-muted-foreground">Aufgaben angelegt</span>
            </li>
            <li>
              <span className="font-medium tabular-nums">{data.tasks.completedLast7d}</span>{" "}
              <span className="text-muted-foreground">erledigt</span>
            </li>
            <li>
              <span className="font-medium tabular-nums">{data.tasks.withDueDatePct}%</span>{" "}
              <span className="text-muted-foreground">davon mit Datum</span>
            </li>
            <li>
              <span className="font-medium tabular-nums">{data.tasks.withReminderPct}%</span>{" "}
              <span className="text-muted-foreground">davon mit Erinnerung</span>
            </li>
            <li>
              <span className="font-medium tabular-nums">{data.suggestions.pending}</span>{" "}
              <span className="text-muted-foreground">offene Vorschläge</span>
            </li>
            <li>
              <span className="font-medium tabular-nums">{data.suggestions.responded}</span>{" "}
              <span className="text-muted-foreground">deiner Entscheidungen erfasst</span>
            </li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
