"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Task } from "./types";

type Props = {
  task: Task;
  onDeleted: () => void;
  disabled?: boolean;
  className?: string;
  /** `icon` = Papierkorb in der Zeile; `text` = sichtbarer Button im Bearbeiten-Dialog */
  trigger?: "icon" | "text";
};

export function TaskDeleteControl({ task, onDeleted, disabled, className, trigger = "icon" }: Props) {
  const id = useId();
  const titleId = `${id}-delete-title`;
  const descId = `${id}-delete-desc`;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirmOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [confirmOpen]);

  async function confirmDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.status === 401) {
        toast.error("Bitte starte zuerst eine Study Session.");
        return;
      }
      if (!res.ok) {
        toast.error("Konnte Aufgabe nicht löschen.");
        return;
      }
      toast.success("Aufgabe gelöscht.");
      setConfirmOpen(false);
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  const portal =
    confirmOpen && typeof document !== "undefined" ? (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setConfirmOpen(false);
        }}
      >
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          data-testid="fp-task-delete-dialog"
          className="w-full max-w-md rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h2 id={titleId} className="font-heading text-base leading-none font-medium">
            Aufgabe löschen?
          </h2>
          <p id={descId} className="mt-3 space-y-2 text-sm text-muted-foreground">
            <span className="block">
              Möchtest du „<span className="font-medium text-foreground">{task.title}</span>“ wirklich endgültig
              löschen?
            </span>
            <span className="block">Diese Aktion lässt sich nicht rückgängig machen.</span>
          </p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Abbrechen
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={busy}>
              Endgültig löschen
            </Button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      {trigger === "text" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive", className)}
          aria-label="Aufgabe löschen"
          aria-expanded={confirmOpen}
          data-fp-delete-trigger=""
          disabled={disabled}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Aufgabe löschen
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn(className)}
          aria-label="Löschen"
          aria-expanded={confirmOpen}
          data-fp-delete-trigger=""
          disabled={disabled}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
      {portal ? createPortal(portal, document.body) : null}
    </>
  );
}
