"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Clock, Sparkles, Undo2, X } from "lucide-react";

import type { AdaptiveSuggestion } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExplanationPopover } from "./explanation-popover";

export function SuggestionCard({
  suggestion,
  onChanged,
}: {
  suggestion: AdaptiveSuggestion;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const shortExplanation = useMemo(() => {
    const text = suggestion.explanation.trim();
    const idx = text.indexOf(".");
    return idx > 20 ? `${text.slice(0, idx + 1)}` : text;
  }, [suggestion.explanation]);

  async function respond(action: "accept" | "reject" | "snooze" | "undo") {
    setBusy(true);
    try {
      const res = await fetch(`/api/suggestions/${suggestion.id}/respond`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        toast.error("Aktion fehlgeschlagen.");
        return;
      }
      toast.success(
        action === "accept"
          ? "Vorschlag angenommen."
          : action === "reject"
            ? "Vorschlag abgelehnt."
            : action === "snooze"
              ? "Später."
              : "Rückgängig.",
      );
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-muted/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base leading-6">{suggestion.title}</CardTitle>
                <div className="mt-0.5 text-xs text-muted-foreground">Vorschlag</div>
              </div>
            </div>
          </div>
          <Badge
            variant={suggestion.status === "pending" ? "secondary" : "outline"}
            className="capitalize"
          >
            {suggestion.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">{shortExplanation}</div>

        <div className="flex flex-wrap items-center gap-2">
          {suggestion.status === "pending" ? (
            <>
              <Button onClick={() => respond("accept")} disabled={busy} className="gap-2">
                <Check className="h-4 w-4" />
                Annehmen
              </Button>
              <Button variant="outline" onClick={() => respond("snooze")} disabled={busy} className="gap-2">
                <Clock className="h-4 w-4" />
                Nicht jetzt
              </Button>
              <Button variant="ghost" onClick={() => respond("reject")} disabled={busy} className="gap-2">
                <X className="h-4 w-4" />
                Ablehnen
              </Button>
            </>
          ) : suggestion.status === "accepted" ? (
            <Button variant="outline" onClick={() => respond("undo")} disabled={busy} className="gap-2">
              <Undo2 className="h-4 w-4" />
              Rückgängig machen
            </Button>
          ) : null}

          <div className="ml-auto">
            <ExplanationPopover
              explanation={suggestion.explanation}
              onOpen={() => {
                fetch("/api/events", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    eventType: "why_clicked",
                    screen: "/adaptive",
                    metadata: { suggestionId: suggestion.id, ruleKey: suggestion.ruleKey },
                  }),
                }).catch(() => {});
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

