"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { studyApiFetch } from "@/lib/http/study-api-fetch";
import { GUEST_STUDY_PSEUDONYMS } from "@/lib/demo/guest-study";

type Me = {
  user: { pseudonym: string } | null;
  session: unknown | null;
  isAdmin?: boolean;
};

export function AdminResetGuestUsersCard() {
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");

  const load = useCallback(async () => {
    const r = await studyApiFetch("/api/me", { cache: "no-store" });
    if (!r.ok) return;
    const data = (await r.json()) as Me;
    setMe(data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => {});
  }, [load]);

  if (!me?.isAdmin) return null;

  async function run() {
    setBusy(true);
    try {
      const res = await studyApiFetch("/api/data/reset-guest-users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "RESET_GUEST_USERS" }),
      });
      if (res.status === 403) {
        toast.error("Kein Admin-User-Code.");
        return;
      }
      if (!res.ok) {
        toast.error("Gast-Konten konnten nicht zurückgesetzt werden.");
        return;
      }
      const data = (await res.json()) as { deletedUsers?: number };
      toast.success("Gast-Konten zurückgesetzt.", {
        description: `Gelöscht: ${data.deletedUsers ?? 0} Konten (${GUEST_STUDY_PSEUDONYMS.join(", ")})`,
      });
      setOpen(false);
      setConfirm("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="fp-card border-sky-200/50 bg-sky-50/30 dark:border-sky-900/40 dark:bg-sky-950/20">
      <CardContent className="space-y-3 p-5">
        <div>
          <div className="text-sm font-semibold tracking-tight">Admin: Gast-User (G01, G02)</div>
          <p className="text-xs text-muted-foreground">
            Löscht nur die Workshop-Gast-Konten{" "}
            <span className="font-mono text-[11px]">{GUEST_STUDY_PSEUDONYMS.join(", ")}</span> inkl. Sessions, Aufgaben
            und Vorschläge. Die F-/T-/E-Demo-User bleiben unverändert. Nächster „Als Gast starten“ vergibt wieder freie
            Slots.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" className="border-sky-700/40" />}>
            Gast-User zurücksetzen
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Gast-User zurücksetzen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Es werden nur <span className="font-medium">G01</span> und <span className="font-medium">G02</span> aus
                der Datenbank entfernt (Cascade). Demo-Testuser F01–E05 bleiben bestehen.
              </p>
              <p>
                Tippe{" "}
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">RESET_GUEST_USERS</span>, um zu
                bestätigen.
              </p>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="RESET_GUEST_USERS"
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Abbrechen
                </Button>
                <Button variant="destructive" onClick={run} disabled={busy || confirm !== "RESET_GUEST_USERS"}>
                  Gast-Konten löschen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
