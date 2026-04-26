"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Clock, Plus, Tag, Type, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseTask, type ParsedTask } from "@/lib/parser/task-parser";

type Priority = "low" | "medium" | "high";

const OPTIONAL_FIELDS = [
  { key: "list", label: "Kategorie", icon: Type },
  { key: "tags", label: "Tags", icon: Tag },
  { key: "duration", label: "Dauer", icon: Clock },
  { key: "reminder", label: "Erinnerung", icon: CalendarClock },
  { key: "description", label: "Beschreibung", icon: Plus },
] as const;

type FieldKey = (typeof OPTIONAL_FIELDS)[number]["key"];

export function ProgressiveTaskForm() {
  const router = useRouter();

  const [naturalInput, setNaturalInput] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");

  const [activeFields, setActiveFields] = useState<Set<FieldKey>>(new Set());
  const [listName, setListName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [reminderTime, setReminderTime] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const liveParse = useMemo<ParsedTask | null>(
    () => (naturalInput.trim().length > 1 ? parseTask(naturalInput) : null),
    [naturalInput],
  );

  useEffect(() => {
    if (!liveParse) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (liveParse.title) setTitle(liveParse.title);
    if (liveParse.dueDate) {
      const d = new Date(liveParse.dueDate);
      setDate(formatDateInput(d));
      const hasTime = liveParse.dueTimeMinutes !== null;
      if (hasTime) setTime(formatTimeInput(d));
    }
    if (liveParse.priority) setPriority(liveParse.priority);
    if (liveParse.listName) {
      setListName(liveParse.listName);
      setActiveFields((s) => new Set(s).add("list"));
    }
    if (liveParse.tags.length > 0) {
      setTags(liveParse.tags);
      setActiveFields((s) => new Set(s).add("tags"));
    }
    if (liveParse.estimatedMinutes) {
      setEstimatedMinutes(String(liveParse.estimatedMinutes));
      setActiveFields((s) => new Set(s).add("duration"));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [liveParse]);

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

  async function submit() {
    if (!title.trim()) {
      toast.error("Titel fehlt.");
      return;
    }
    setSubmitting(true);
    try {
      const dueIso = combineDateTime(date, time);
      const reminderIso =
        activeFields.has("reminder") && reminderTime && date
          ? combineDateTime(date, reminderTime)
          : null;
      const payload = {
        title: title.trim(),
        description: activeFields.has("description") && description.trim() ? description.trim() : null,
        priority,
        dueDate: dueIso,
        reminderAt: reminderIso,
        listName: activeFields.has("list") && listName.trim() ? listName.trim() : null,
        tags: activeFields.has("tags") ? tags : [],
        estimatedMinutes:
          activeFields.has("duration") && estimatedMinutes
            ? Number(estimatedMinutes)
            : null,
      };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        toast.error("Bitte starte zuerst eine Study Session.");
        return;
      }
      if (!res.ok) {
        toast.error("Speichern fehlgeschlagen.");
        return;
      }

      if (reminderIso) {
        fetch("/api/events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            eventType: "reminder_added",
            screen: "/erstellen",
            metadata: { reminderAt: reminderIso },
          }),
        }).catch(() => {});
      }

      toast.success("Aufgabe angelegt.");
      router.push("/aufgaben");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
      <div className="space-y-6">
        <Card className="fp-card">
          <CardContent className="space-y-4 p-5 md:p-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="natural">
                Sprachfeld (optional)
              </label>
              <Input
                id="natural"
                placeholder='z. B. "Kapitel 2 lesen morgen 9 Uhr für Studium #literatur 60 min"'
                value={naturalInput}
                onChange={(e) => setNaturalInput(e.target.value)}
              />
              {liveParse && liveParse.tokens.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {liveParse.tokens.map((tk, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                    >
                      {tk.kind}: {tk.value}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="title">
                Titel
              </label>
              <Input
                id="title"
                placeholder="Was steht an?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="date">
                  Datum
                </label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="time">
                  Uhrzeit
                </label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priorität</label>
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

            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                Zusatzfelder bei Bedarf
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

            {activeFields.has("list") ? (
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Kategorie</label>
                <Input
                  placeholder="z. B. Studium"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                />
              </div>
            ) : null}

            {activeFields.has("tags") ? (
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tags</label>
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
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Dauer (Minuten)
                </label>
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
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Erinnerung (Uhrzeit am Fälligkeitstag)
                </label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
                {!date ? (
                  <span className="text-[11px] text-muted-foreground">
                    Erinnerung greift nur, wenn ein Datum gesetzt ist.
                  </span>
                ) : null}
              </div>
            ) : null}

            {activeFields.has("description") ? (
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Beschreibung
                </label>
                <Textarea
                  rows={4}
                  placeholder="Kurz, ruhig, nur wenn nötig."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Abbrechen
              </Button>
              <Button onClick={submit} disabled={submitting || !title.trim()}>
                Aufgabe anlegen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="fp-card">
          <CardContent className="space-y-2 p-5">
            <div className="text-sm font-semibold tracking-tight">Reduziertes Formular</div>
            <p className="text-sm text-muted-foreground">
              Sichtbar sind nur Titel, Datum und Priorität. Alles Weitere wird per Chip
              ergänzt – ohne dass FluxPlan Felder selbst einblendet.
            </p>
          </CardContent>
        </Card>

        <Card className="fp-card-soft">
          <CardContent className="space-y-2 p-5">
            <div className="text-sm font-semibold tracking-tight">Sprachparser</div>
            <p className="text-sm text-muted-foreground">
              Erkennt deutsche Datums- und Zeitausdrücke sowie #Tags, !Priorität und
              Dauer. Das Ergebnis ist immer als Chip sichtbar – nichts geschieht
              still im Hintergrund.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>· „heute 14 uhr“</li>
              <li>· „morgen 9:30 für Studium 60 min“</li>
              <li>· „Fr 12.5. !hoch #recherche“</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="fp-card">
          <CardContent className="space-y-2 p-5">
            <div className="text-sm font-semibold tracking-tight">Microcopy</div>
            <p className="text-sm text-muted-foreground">
              FluxPlan zeigt keine Felder, die du nicht ausgewählt hast. Auch
              Vorbelegungen aus dem Sprachfeld kannst du jederzeit überschreiben.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
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
