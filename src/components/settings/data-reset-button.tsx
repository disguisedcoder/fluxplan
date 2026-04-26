"use client";

import { useState } from "react";
import { toast } from "sonner";

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
      const res = await fetch("/api/data/reset", { method: "POST" });
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
            Dabei werden Aufgaben, Interaktionen, Vorschläge und Einstellungen für
            dieses Pseudonym gelöscht. Die Studien-Session bleibt erhalten.
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
