"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, ChevronDown, ChevronUp, Clock, Plus, Tag, Type, X } from "lucide-react";

import { studyApiFetch } from "@/lib/http/study-api-fetch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Task } from "./types";
import { TaskDeleteControl } from "./task-delete-control";
import { readTaskFormOptionalFold } from "@/lib/settings/task-form-optional-fold";
import { readAdaptiveTaskFormChips } from "@/lib/settings/task-form-chips";
import { TaskScheduleOverlapHint } from "@/components/tasks/task-schedule-overlap-hint";
import { FieldSuggestionChips } from "@/components/tasks/field-suggestion-chips";
import { useTaskFieldSuggestions } from "@/components/tasks/use-task-field-suggestions";

type Priority = "low" | "medium" | "high";

const OPTIONAL_FIELDS = [
  { key: "list", label: "Kategorie", icon: Type },
  { key: "tags", label: "Tags", icon: Tag },
  { key: "duration", label: "Dauer", icon: Clock },
  { key: "reminder", label: "Erinnerung", icon: CalendarClock },
  { key: "description", label: "Beschreibung", icon: Plus },
] as const;

type FieldKey = (typeof OPTIONAL_FIELDS)[number]["key"];

type TaskPayload = {
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: string | null;
  reminderAt: string | null;
  listName: string | null;
  tags: string[];
  estimatedMinutes: number | null;
};

function buildPayload(
  title: string,
  description: string,
  priority: Priority,
  date: string,
  time: string,
  listName: string,
  tags: string[],
  estimatedMinutes: string,
  reminderTime: string,
  activeFields: Set<FieldKey>,
): TaskPayload {
  const dueIso = combineDateTime(date, time);
  const reminderIso =
    activeFields.has("reminder") && reminderTime && date ? combineDateTime(date, reminderTime) : null;
  return {
    title: title.trim(),
    description: activeFields.has("description") && description.trim() ? description.trim() : null,
    priority,
    dueDate: dueIso,
    reminderAt: reminderIso,
    listName: activeFields.has("list") && listName.trim() ? listName.trim() : null,
    tags: activeFields.has("tags") ? tags : [],
    estimatedMinutes:
      activeFields.has("duration") && estimatedMinutes ? Number(estimatedMinutes) : null,
  };
}

function initialActiveFields(mode: "create" | "edit", initial?: Task): Set<FieldKey> {
  if (mode === "create" || !initial) return new Set();
  const fields = new Set<FieldKey>();
  if (initial.listName?.trim()) fields.add("list");
  if (initial.tags.length > 0) fields.add("tags");
  if (initial.estimatedMinutes != null) fields.add("duration");
  if (initial.reminderAt) fields.add("reminder");
  if (initial.description?.trim()) fields.add("description");
  return fields;
}

function TaskFormDialogBody({
  mode,
  initial,
  onSaved,
  setOpen,
}: {
  mode: "create" | "edit";
  initial?: Task;
  onSaved?: () => void;
  setOpen: (open: boolean) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [taskStatus, setTaskStatus] = useState<"open" | "done">(() =>
    initial?.status === "done" ? "done" : "open",
  );

  const [title, setTitle] = useState(() => initial?.title ?? "");
  const [description, setDescription] = useState(() => initial?.description ?? "");
  const [priority, setPriority] = useState<Priority>(() => initial?.priority ?? "medium");
  const [date, setDate] = useState(() =>
    initial?.dueDate ? formatDateInput(new Date(initial.dueDate)) : "",
  );
  const [time, setTime] = useState(() =>
    initial?.dueDate ? formatTimeInput(new Date(initial.dueDate)) : "",
  );

  const [activeFields, setActiveFields] = useState<Set<FieldKey>>(() => initialActiveFields(mode, initial));
  const [listName, setListName] = useState(() => initial?.listName ?? "");
  const [tags, setTags] = useState(() => (initial?.tags ? [...initial.tags] : []));
  const [tagInput, setTagInput] = useState("");
  const loadFieldSuggestions = activeFields.has("list") || activeFields.has("tags");
  const { topListNames, topTags } = useTaskFieldSuggestions(loadFieldSuggestions);
  const [estimatedMinutes, setEstimatedMinutes] = useState(() =>
    initial?.estimatedMinutes != null ? String(initial.estimatedMinutes) : "",
  );
  const [reminderTime, setReminderTime] = useState(() =>
    initial?.reminderAt ? formatTimeInput(new Date(initial.reminderAt)) : "",
  );

  const [optionalExpanded, setOptionalExpanded] = useState(() => {
    if (mode === "edit" && initial) {
      return initialActiveFields(mode, initial).size > 0;
    }
    return true;
  });

  useEffect(() => {
    let cancelled = false;
    if (mode === "edit" && initial && initialActiveFields(mode, initial).size > 0) return;

    studyApiFetch("/api/preferences", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { preferences?: Record<string, unknown> } | null) => {
        if (cancelled || !data?.preferences) return;
        if (readTaskFormOptionalFold(data.preferences.taskFormOptionalFold)) {
          setOptionalExpanded(false);
        }
        const chipPref = readAdaptiveTaskFormChips(data.preferences["adaptive.taskFormChips"]);
        if (chipPref.enabled && chipPref.chipKeys.length > 0) {
          setActiveFields((prev) => {
            const n = new Set(prev);
            for (const k of chipPref.chipKeys) n.add(k);
            return n;
          });
          setOptionalExpanded(true);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Body remountet pro Task (`key`), `initial?.id` genügt
  }, [mode, initial?.id]);

  const canSubmit = useMemo(() => title.trim().length > 0 && !submitting, [title, submitting]);

  const taskForDelete = useMemo((): Task | null => {
    if (mode !== "edit" || !initial) return null;
    return { ...initial, title: title.trim() || initial.title };
  }, [mode, initial, title]);

  function toggleField(key: FieldKey) {
    setActiveFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function commitTag() {
    const v = tagInput.trim().toLowerCase();
    if (!v) return;
    if (!tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  }

  async function toggleDone(next: boolean) {
    if (mode !== "edit" || !initial || initial.status === "archived") return;
    setStatusBusy(true);
    try {
      const res = await studyApiFetch(`/api/tasks/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next ? "done" : "open" }),
      });
      if (res.status === 401) {
        toast.error("Bitte starte zuerst eine Study Session.");
        return;
      }
      if (!res.ok) {
        toast.error("Status konnte nicht gespeichert werden.");
        return;
      }
      setTaskStatus(next ? "done" : "open");
      toast.success(next ? "Als erledigt markiert." : "Wieder geöffnet.");
      onSaved?.();
    } finally {
      setStatusBusy(false);
    }
  }

  async function submit() {
    if (!canSubmit) return;
    if (mode === "edit" && !initial) return;

    setSubmitting(true);
    const payload = buildPayload(
      title,
      description,
      priority,
      date,
      time,
      listName,
      tags,
      estimatedMinutes,
      reminderTime,
      activeFields,
    );

    try {
      const res =
        mode === "create"
          ? await studyApiFetch("/api/tasks", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await studyApiFetch(`/api/tasks/${initial!.id}`, {
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
    <>
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "Neue Aufgabe" : "Aufgabe bearbeiten"}</DialogTitle>
      </DialogHeader>

      {mode === "edit" && initial && initial.status !== "archived" ? (
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
          <Checkbox
            id="task-form-done"
            checked={taskStatus === "done"}
            disabled={statusBusy || submitting}
            onCheckedChange={(v) => toggleDone(Boolean(v))}
            aria-label={taskStatus === "done" ? "Aufgabe wieder öffnen" : "Aufgabe als erledigt markieren"}
          />
          <label htmlFor="task-form-done" className="cursor-pointer text-sm font-medium leading-none">
            {taskStatus === "done" ? "Erledigt" : "Als erledigt markieren"}
          </label>
        </div>
      ) : null}

      <div className="grid gap-4">
        <div className="grid gap-2">
          <div className="text-sm font-medium">Titel</div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Was steht an?"
            className={cn(mode === "edit" && taskStatus === "done" && "line-through text-muted-foreground")}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-2">
            <div className="text-sm font-medium">Datum</div>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">Uhrzeit</div>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <div className="text-sm font-medium">Priorität</div>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Niedrig</SelectItem>
                <SelectItem value="medium">Mittel</SelectItem>
                <SelectItem value="high">Hoch</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TaskScheduleOverlapHint
          date={date}
          time={time}
          estimatedMinutes={
            activeFields.has("duration") && estimatedMinutes ? Number(estimatedMinutes) : null
          }
          excludeTaskId={mode === "edit" ? initial?.id : undefined}
        />

        {optionalExpanded || activeFields.size > 0 ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-medium text-muted-foreground">Zusatzfelder bei Bedarf</div>
              {optionalExpanded && activeFields.size === 0 ? (
                <button
                  type="button"
                  onClick={() => setOptionalExpanded(false)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  Einklappen
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {OPTIONAL_FIELDS.map((f) => {
                const Icon = f.icon;
                const active = activeFields.has(f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => toggleField(f.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOptionalExpanded(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/35 hover:text-foreground"
          >
            <ChevronDown className="h-4 w-4 shrink-0" />
            <span>
              Weitere Felder einblenden{" "}
              <span className="text-xs text-muted-foreground/90">(Kategorie, Tags, Dauer, …)</span>
            </span>
          </button>
        )}

        {activeFields.has("list") ? (
          <div className="grid gap-2">
            <div className="text-sm font-medium">Kategorie</div>
            <FieldSuggestionChips
              items={topListNames}
              onPick={setListName}
              isDisabled={(name) => listName.trim() === name}
            />
            <Input
              placeholder="z. B. Studium"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
            />
          </div>
        ) : null}

        {activeFields.has("tags") ? (
          <div className="grid gap-2">
            <div className="text-sm font-medium">Tags</div>
            <FieldSuggestionChips
              items={topTags}
              formatItem={(t) => `#${t}`}
              onPick={(t) => {
                const v = t.toLowerCase();
                if (!tags.includes(v)) setTags([...tags, v]);
              }}
              isDisabled={(t) => tags.includes(t.toLowerCase())}
            />
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    aria-label="Tag entfernen"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    commitTag();
                  }
                }}
                onBlur={commitTag}
                placeholder="Tag eintippen + Enter"
                className="min-w-[120px] flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
        ) : null}

        {activeFields.has("duration") ? (
          <div className="grid gap-2">
            <div className="text-sm font-medium">Dauer (Minuten)</div>
            <Input
              type="number"
              min={5}
              max={1440}
              step={5}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="z. B. 45"
            />
          </div>
        ) : null}

        {activeFields.has("reminder") ? (
          <div className="grid gap-2">
            <div className="text-sm font-medium">Erinnerung (Uhrzeit am Fälligkeitstag)</div>
            <Input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
            {!date ? (
              <span className="text-[11px] text-muted-foreground">
                Erinnerung greift nur, wenn ein Datum gesetzt ist.
              </span>
            ) : null}
          </div>
        ) : null}

        {activeFields.has("description") ? (
          <div className="grid gap-2">
            <div className="text-sm font-medium">Beschreibung</div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurz und ruhig – nur wenn nötig."
              rows={4}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-8">
            {taskForDelete ? (
              <TaskDeleteControl
                task={taskForDelete}
                trigger="text"
                disabled={submitting}
                onDeleted={() => {
                  setOpen(false);
                  onSaved?.();
                }}
              />
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Abbrechen
            </Button>
            <Button className="w-full sm:w-auto" onClick={submit} disabled={!canSubmit}>
              Speichern
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function TaskFormDialog({
  mode,
  initial,
  triggerLabel,
  onSaved,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger,
  triggerSize = "default",
}: {
  mode: "create" | "edit";
  initial?: Task;
  triggerLabel: string;
  onSaved?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  triggerSize?: "xs" | "sm" | "default";
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;

  const formKey = open ? (mode === "edit" && initial ? initial.id : "create") : "closed";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {hideTrigger ? null : (
        <DialogTrigger
          render={<Button variant={mode === "create" ? "default" : "outline"} size={triggerSize} />}
        >
          {triggerLabel}
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {open ? (
          <TaskFormDialogBody
            key={formKey}
            mode={mode}
            initial={initial}
            onSaved={onSaved}
            setOpen={setOpen}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function combineDateTime(date: string, time: string) {
  if (!date) return null;
  const t = time ? time : "12:00";
  const local = new Date(`${date}T${t}:00`);
  if (isNaN(local.getTime())) return null;
  return local.toISOString();
}

function formatDateInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTimeInput(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
