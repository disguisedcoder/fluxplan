"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, Calendar as CalIcon, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  categoryBadgeClass,
  categoryToneFor,
  pickPrimaryCategory,
} from "@/lib/ui/category";
import type { Task } from "./types";
import { TaskFormDialog } from "./task-form-dialog";

export function TaskCard({ task, onChanged }: { task: Task; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);

  const category = pickPrimaryCategory(task);
  const tone = categoryToneFor(category);

  const dueLabel = useMemo(() => formatDue(task.dueDate), [task.dueDate]);
  const isOverdue = isOverdueAt(task);

  async function toggleDone(next: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next ? "done" : "open" }),
      });
      if (res.status === 401) {
        toast.error("Bitte starte zuerst eine Study Session.");
        return;
      }
      if (!res.ok) {
        toast.error("Konnte Aufgabe nicht aktualisieren.");
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Konnte Aufgabe nicht löschen.");
        return;
      }
      toast.success("Aufgabe gelöscht.");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      className={cn(
        "fp-card transition-colors",
        task.status === "done" && "opacity-70",
      )}
    >
      <CardContent className="flex items-start gap-4 p-4 md:p-5">
        <div className="pt-0.5">
          <Checkbox
            checked={task.status === "done"}
            onCheckedChange={(v) => toggleDone(Boolean(v))}
            disabled={busy}
            aria-label={`Aufgabe ${task.title} erledigen`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className={cn(
                  "truncate text-[0.95rem] font-medium leading-6",
                  task.status === "done" && "line-through text-muted-foreground",
                )}
              >
                {task.title}
              </div>
              {task.description ? (
                <div className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {task.description}
                </div>
              ) : null}
            </div>
            {category ? (
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
                  categoryBadgeClass(tone),
                )}
              >
                {category}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {dueLabel ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1.5",
                  isOverdue && "text-destructive",
                )}
              >
                <CalIcon className="h-3.5 w-3.5" />
                {dueLabel}
              </span>
            ) : null}
            {task.reminderAt ? (
              <span className="inline-flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                {formatTime(task.reminderAt)}
              </span>
            ) : null}
            <PriorityIndicator priority={task.priority} />
            {task.estimatedMinutes ? (
              <span className="text-muted-foreground/80">
                {task.estimatedMinutes} min
              </span>
            ) : null}

            <div className="ml-auto flex items-center gap-1">
              <TaskFormDialog
                mode="edit"
                initial={task}
                triggerLabel="Bearbeiten"
                onSaved={onChanged}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={remove}
                disabled={busy}
                aria-label="Löschen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PriorityIndicator({ priority }: { priority: Task["priority"] }) {
  const tone =
    priority === "high"
      ? "is-warning"
      : priority === "medium"
        ? "is-info"
        : "is-positive";
  const label =
    priority === "high" ? "Hoch" : priority === "medium" ? "Mittel" : "Niedrig";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("fp-status-dot", tone)} aria-hidden />
      {label}
    </span>
  );
}

function formatDue(dueDate: string | null) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const datePart = sameDay(d, today)
    ? "Heute"
    : sameDay(d, tomorrow)
      ? "Morgen"
      : d.toLocaleDateString(undefined, {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        });
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  return hasTime ? `${datePart} · ${time}` : datePart;
}

function formatTime(value: string) {
  const d = new Date(value);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isOverdueAt(task: Task) {
  if (!task.dueDate) return false;
  if (task.status === "done") return false;
  return new Date(task.dueDate).getTime() < new Date().getTime();
}
