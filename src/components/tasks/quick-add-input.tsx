"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuickAddInput({
  placeholder = "Schnelle Eingabe …",
  buttonLabel = "Anlegen",
  onCreated,
}: {
  placeholder?: string;
  buttonLabel?: string;
  onCreated?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const trimmed = title.trim();
    if (trimmed.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: trimmed, priority: "medium" }),
      });
      if (res.status === 401) {
        toast.error("Bitte starte zuerst eine Session in den Einstellungen.");
        return;
      }
      if (!res.ok) {
        toast.error("Konnte Aufgabe nicht anlegen.");
        return;
      }
      setTitle("");
      onCreated?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        className="h-10 flex-1 min-w-[12rem] rounded-xl"
        aria-label="Neue Aufgabe schnell hinzufügen"
      />
      <Button type="submit" disabled={busy || title.trim().length === 0}>
        {buttonLabel}
      </Button>
    </form>
  );
}
