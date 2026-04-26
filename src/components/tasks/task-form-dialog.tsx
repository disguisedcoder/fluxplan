"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "./types";

type Priority = "low" | "medium" | "high";

type TaskInput = {
  title: string;
  description?: string | null;
  priority?: Priority;
  dueDate?: string | null;
};

export function TaskFormDialog({
  mode,
  initial,
  triggerLabel,
  onSaved,
}: {
  mode: "create" | "edit";
  initial?: Task;
  triggerLabel: string;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [dueDate, setDueDate] = useState<string>(initial?.dueDate?.slice(0, 10) ?? "");

  const canSubmit = useMemo(() => title.trim().length > 0 && !submitting, [title, submitting]);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const payload: TaskInput = {
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      priority,
      dueDate: dueDate ? new Date(`${dueDate}T12:00:00.000Z`).toISOString() : null,
    };

    try {
      const res =
        mode === "create"
          ? await fetch("/api/tasks", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/tasks/${initial!.id}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            });

      if (res.status === 401) {
        toast.error("Bitte starte zuerst eine Study Session.", { description: "Wechsle zu „Study Mode“." });
        return;
      }
      if (!res.ok) {
        toast.error("Speichern fehlgeschlagen.");
        return;
      }
      toast.success(mode === "create" ? "Aufgabe erstellt." : "Aufgabe aktualisiert.");
      setOpen(false);
      onSaved?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant={mode === "create" ? "default" : "outline"} />}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Neue Aufgabe" : "Aufgabe bearbeiten"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-medium">Titel</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Was steht an?" />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Beschreibung (optional)</div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurz und ruhig – nur wenn nötig."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Priorität</div>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Fällig am</div>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Abbrechen
            </Button>
            <Button onClick={submit} disabled={!canSubmit}>
              Speichern
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

