"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { studyApiFetch } from "@/lib/http/study-api-fetch";
import { isDemoTestPseudonym, roleFromPseudonym } from "@/lib/demo";

type Role = "familienplanner" | "taskplanner" | "evalrunner";

export function DemoSeedButton({ onDone }: { onDone?: () => void }) {
  const [role, setRole] = useState<Role>("taskplanner");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    studyApiFetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { user?: { pseudonym?: string } | null } | null) => {
        if (cancelled || !d?.user?.pseudonym) return;
        if (isDemoTestPseudonym(d.user.pseudonym)) {
          setRole(roleFromPseudonym(d.user.pseudonym));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function run() {
    setBusy(true);
    try {
      const res = await studyApiFetch("/api/data/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, resetFirst: true }),
      });
      if (res.status === 401) {
        toast.error("Bitte starte zuerst eine Study Session.");
        return;
      }
      if (!res.ok) {
        toast.error("Demo-Daten konnten nicht geladen werden.");
        return;
      }
      const data = (await res.json()) as { role?: string; createdTasks?: number };
      toast.success("Demo-Daten geladen.", {
        description: `Rolle: ${data.role ?? role} · Aufgaben: ${data.createdTasks ?? 10}`,
      });
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium">Rolle</div>
        <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={busy}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="familienplanner">Familienplanner</SelectItem>
            <SelectItem value="taskplanner">Taskplanner</SelectItem>
            <SelectItem value="evalrunner">Eval-Runner</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button onClick={run} disabled={busy}>
        Demo-Daten laden
      </Button>
    </div>
  );
}

