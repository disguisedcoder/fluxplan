"use client";

import { useState } from "react";
import { toast } from "sonner";

import { studyApiFetch } from "@/lib/http/study-api-fetch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DataResetButton({ onDone }: { onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");

  async function reset() {
    setBusy(true);
    try {
      const res = await studyApiFetch("/api/data/reset", { method: "POST" });
      if (!res.ok) {
        toast.error("Reset fehlgeschlagen.");
        return;
      }
      toast.success("Daten zurückgesetzt.");
      setOpen(false);
      setConfirm("");
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>Daten zurücksetzen</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Daten zurücksetzen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Es werden nur die Daten der <span className="font-medium text-foreground">aktuellen Studien-Session</span>{" "}
            geleert: Aufgaben, adaptive Vorschläge, Nutzungsprotokoll (Interaktionen) und protokollierte Ereignisse
            dieser Session. <span className="font-medium text-foreground">Einstellungen</span> für diesen User-Code
            bleiben bestehen. <span className="font-medium text-foreground">Andere Teilnehmende</span> werden nicht
            beeinflusst. Du bleibst angemeldet.
          </p>
          <p className="text-muted-foreground text-xs">
            Gast-Codes <span className="font-mono">G01</span>/<span className="font-mono">G02</span> mit Session: danach
            wieder der <span className="font-medium">Workshop-Komplett-Stand</span> (Aufgaben + Vorschläge wie im
            Workshop-Skript).
          </p>
          <p className="text-muted-foreground text-xs">
            Demo-Test-Codes <span className="font-mono">F01–F05</span>, <span className="font-mono">T01–T05</span>,{" "}
            <span className="font-mono">E01–E05</span>, <span className="font-mono">P01–P05</span> mit Session:
            danach wieder die <span className="font-medium">Werkstatt-Demo</span> passend zum Code (F = Familie, T =
            Task, E = Eval) — keine leere Session, sondern dieselben Demo-Aufgaben und -Einstellungen wie beim ersten
            Laden über &quot;Demo-Daten laden&quot;.
          </p>
          <p className="text-muted-foreground text-xs">
            Ohne aktive Session-Cookies löscht die Funktion aus technischen Gründen alle App-Daten dieses User-Codes
            inkl. Einstellungen.
          </p>
          <p className="text-muted-foreground text-xs">
            Die <span className="font-medium text-foreground">adaptiven Regeln</span> unter Anpassungen bleiben
            verfügbar. <span className="font-medium text-foreground">Neue Vorschläge</span> erscheinen erst wieder, wenn
            du die App so nutzt, dass eine Regel auslöst — fehlende Vorschläge nach dem Reset sind also erwartbar, bis du
            z. B. navigierst, Aufgaben anlegst oder Heute öffnest. Gast- und Demo-Workshops laden nach dem Reset wieder
            vorbereitete Beispiel-Vorschläge.
          </p>
          <p>
            Tippe <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">RESET</span>,
            um zu bestätigen.
          </p>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="RESET"
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={reset}
              disabled={busy || confirm !== "RESET"}
            >
              Endgültig zurücksetzen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
