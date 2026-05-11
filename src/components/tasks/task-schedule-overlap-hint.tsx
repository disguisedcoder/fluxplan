"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import type { Task } from "./types";
import {
  inferOverlapHintDurationMinutes,
  overlappingOpenTasksForDraft,
  OVERLAP_HINT_FALLBACK_MINUTES,
} from "@/lib/planning/task-time-overlap";
import { studyApiFetch } from "@/lib/http/study-api-fetch";

type Props = {
  date: string;
  time: string;
  /** Nur wenn „Dauer“ aktiv und ausgefüllt; sonst Herleitung aus vorhandenen Aufgaben (s. Text). */
  estimatedMinutes: number | null;
  excludeTaskId?: string;
};

export function TaskScheduleOverlapHint({ date, time, estimatedMinutes, excludeTaskId }: Props) {
  const [openTasks, setOpenTasks] = useState<Task[]>([]);

  useEffect(() => {
    let cancelled = false;
    studyApiFetch("/api/tasks?status=open", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { tasks?: Task[] } | null) => {
        if (cancelled || !data?.tasks) return;
        setOpenTasks(data.tasks);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const inferredMinutes = useMemo(
    () =>
      inferOverlapHintDurationMinutes(
        openTasks.map((x) => ({ estimatedMinutes: x.estimatedMinutes, createdAt: x.createdAt })),
      ),
    [openTasks],
  );

  const overlapTitles = useMemo(() => {
    if (!date) return [];
    const t = time ? time : "12:00";
    const draftDue = new Date(`${date}T${t}:00`);
    if (isNaN(draftDue.getTime())) return [];
    return overlappingOpenTasksForDraft(
      draftDue,
      estimatedMinutes,
      openTasks,
      excludeTaskId,
      inferredMinutes,
    );
  }, [date, time, estimatedMinutes, openTasks, excludeTaskId, inferredMinutes]);

  if (overlapTitles.length === 0) return null;

  return (
    <div className="flex gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-50">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <div>
        <span className="font-medium">Zeitliche Überschneidung möglich.</span>{" "}
        <span className="text-amber-900/90 dark:text-amber-100/90">
          Zu diesem Zeitpunkt gibt es bereits {overlapTitles.length === 1 ? "eine Aufgabe" : "Aufgaben"} mit
          überlappendem Zeitfenster. Fehlende Dauern nimmt der Hinweis aus deinen offenen Aufgaben: Dauer der
          zuletzt angelegten Aufgabe mit Schätzwert, sonst der häufigste Schätzwert, sonst {OVERLAP_HINT_FALLBACK_MINUTES}{" "}
          Min. (gilt für deinen Entwurf und für andere Aufgaben ohne Dauer).{" "}
          <span className="font-medium">{overlapTitles.slice(0, 4).join(", ")}</span>
          {overlapTitles.length > 4 ? " …" : ""}. Du kannst trotzdem speichern — FluxPlan verschiebt nichts.
        </span>
      </div>
    </div>
  );
}
