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
import { GUEST_STUDY_PSEUDONYMS } from "@/lib/demo/guest-study";
import { studyApiFetch } from "@/lib/http/study-api-fetch";
import { DEMO_TEST_PSEUDONYMS } from "@/lib/demo/test-pseudonyms";

type Me = {
  user: { pseudonym: string } | null;
  session: unknown | null;
  isAdmin?: boolean;
};

export function AdminResetDemoUsersCard() {
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
      const res = await studyApiFetch("/api/data/reset-demo-users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "RESET_DEMO_USERS" }),
      });
      if (res.status === 403) {
        toast.error("Kein Admin-User-Code.");
        return;
      }
      if (!res.ok) {
        toast.error("Zurücksetzen fehlgeschlagen.");
        return;
      }
      const data = (await res.json()) as { deletedUsers?: number };
      toast.success("Demo-Testuser und Gast-Codes zurückgesetzt.", {
        description: `Gelöscht/neu angelegt: ${data.deletedUsers ?? DEMO_TEST_PSEUDONYMS.length + GUEST_STUDY_PSEUDONYMS.length} Konten`,
      });
      setOpen(false);
      setConfirm("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="fp-card border-amber-200/50 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20">
      <CardContent className="space-y-3 p-5">
        <div>
          <div className="text-sm font-semibold tracking-tight">Admin: Demo-Testuser</div>
          <p className="text-xs text-muted-foreground">
            Löscht die {DEMO_TEST_PSEUDONYMS.length} Demo-User-Codes{" "}
            <span className="font-mono text-[11px]">{DEMO_TEST_PSEUDONYMS.join(", ")}</span> sowie die Gast-Codes{" "}
            <span className="font-mono text-[11px]">{GUEST_STUDY_PSEUDONYMS.join(", ")}</span> inkl. Daten; die
            Demo-User legt das System wie beim Seed neu an. Dein Admin-Konto ({me.user?.pseudonym}) bleibt unberührt.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button variant="outline" className="border-amber-700/40" />}>
            Alle Demo-Testuser zurücksetzen
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Alle Demo-Testuser zurücksetzen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Das betrifft <span className="font-medium">F01–F05, T01–T05, E01–E05, P01–P05</span> sowie{" "}
                <span className="font-medium">G01, G02</span> (Gast-Workshop). Andere User-Codes bleiben in der
                Datenbank.
              </p>
              <p>
                Tippe{" "}
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">RESET_DEMO_USERS</span>, um zu
                bestätigen.
              </p>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="RESET_DEMO_USERS"
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
                  Abbrechen
                </Button>
                <Button
                  variant="destructive"
                  onClick={run}
                  disabled={busy || confirm !== "RESET_DEMO_USERS"}
                >
                  Zurücksetzen & neu anlegen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
