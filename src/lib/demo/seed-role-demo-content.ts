import { Prisma, TaskPriority, TaskStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { runAdaptiveEngine } from "@/lib/adaptive/adaptiveEngine";
import { getDemoRole } from "./index";
import type { DemoRoleKey } from "@/lib/demo/types";

export type DemoSeedReason = "demo_request" | "session_data_reset" | "session_start" | "prisma_seed";

/** Idempotent: fehlende Standard-Regeln anlegen (wie bisher in `/api/data/demo`). */
export async function ensureDefaultAdaptiveRules() {
  await prisma.adaptiveRule.createMany({
    data: [
      {
        key: "view_preference",
        name: "Ansichtspräferenz",
        description: "Schlägt vor, eine häufig genutzte Ansicht als Startansicht zu setzen.",
        enabled: true,
      },
      {
        key: "reminder_preference",
        name: "Erinnerungs-Präferenz",
        description: "Schlägt bei ähnlichen Aufgaben eine Erinnerung vor, wenn du das oft tust.",
        enabled: true,
      },
      {
        key: "daily_focus",
        name: "Fokusvorschlag",
        description: "Schlägt beim Öffnen der Heute-Ansicht Fokus-Aufgaben vor (ohne automatisch zu priorisieren).",
        enabled: true,
      },
      {
        key: "calendar_conflict",
        name: "Kalender-Konflikthinweis",
        description:
          "Warnt nach dem Anlegen einer Aufgabe mit Termin, wenn die Summe der geschätzten Minuten offener Aufgaben an diesem Kalendertag mindestens 8 Stunden beträgt. FluxPlan verschiebt nichts automatisch.",
        enabled: true,
      },
      {
        key: "adaptive_task_creation",
        name: "Adaptives Aufgabenformular",
        description: "Hält das Formular zuerst einfach und schlägt Zusatzfelder als Chips vor.",
        enabled: true,
      },
      {
        key: "adaptive_optional_fold",
        name: "Formular: Zusatzfelder einklappen",
        description:
          "Klappt selten genutzte Zusatzfelder beim Anlegen zunächst ein (jederzeit ausklappbar).",
        enabled: true,
      },
      {
        key: "adaptive_optional_unfold",
        name: "Formular: Zusatzfelder wieder ausklappen",
        description:
          "Schlägt vor, eingeklappte Zusatzfelder wieder sichtbar zu machen, wenn sie wieder häufig genutzt werden.",
        enabled: true,
      },
    ],
    skipDuplicates: true,
  });
}

/**
 * Legt Workshop-/Rollen-Demo an (Aufgaben, Präferenzen, Demo-Interaktionen, Engine-Lauf).
 * Aufrufer ist für vorheriges Leeren der Session verantwortlich.
 */
export async function seedRoleDemoContent(args: {
  userId: string;
  studySessionId: string | null;
  roleKey: DemoRoleKey;
  isBaseline: boolean;
  seedReason: DemoSeedReason;
  /** Nur Metadaten (z. B. `/api/data/demo` mit resetFirst). */
  logResetFirst?: boolean;
}) {
  const { userId, studySessionId, roleKey, isBaseline, seedReason, logResetFirst } = args;
  const def = getDemoRole(roleKey, new Date());

  await prisma.$transaction(async (tx) => {
    if (isBaseline) {
      await tx.userPreference.upsert({
        where: { userId_key: { userId, key: "adaptive.enabled" } },
        update: { value: { value: false } as unknown as Prisma.InputJsonValue },
        create: { userId, key: "adaptive.enabled", value: { value: false } as unknown as Prisma.InputJsonValue },
      });
    }

    if (def.preferences?.length) {
      for (const p of def.preferences) {
        if (isBaseline && (p.key === "adaptive.enabled" || p.key === "adaptive.interventionLevel")) {
          continue;
        }
        const value =
          p.value === null || p.value === undefined
            ? null
            : typeof p.value === "object"
              ? p.value
              : { value: p.value };
        await tx.userPreference.upsert({
          where: { userId_key: { userId, key: p.key } },
          update: { value: value as Prisma.InputJsonValue },
          create: { userId, key: p.key, value: value as Prisma.InputJsonValue },
        });
      }
    }

    await tx.task.createMany({
      data: def.tasks.map((t) => ({
        userId,
        ...(studySessionId ? { studySessionId } : {}),
        title: t.title,
        description: t.description ?? null,
        status: TaskStatus.open,
        priority: (t.priority ?? "medium") as TaskPriority,
        dueDate: t.dueDate ?? null,
        reminderAt: t.reminderAt ?? null,
        listName: t.listName ?? null,
        tags: [...(t.tags ?? [])],
        estimatedMinutes: t.estimatedMinutes ?? null,
      })),
      skipDuplicates: true,
    });

    if (def.viewEvents?.length) {
      await tx.taskInteraction.createMany({
        data: def.viewEvents.map((e, idx) => ({
          userId,
          ...(studySessionId ? { studySessionId } : {}),
          type: "view_changed",
          metadata: { from: e.from ?? null, to: e.to, source: "demo", order: idx } as unknown as Prisma.InputJsonValue,
        })),
      });
    }

    await tx.eventLog.create({
      data: {
        userId,
        sessionId: studySessionId ?? null,
        eventType: "demo_seeded",
        screen: "/einstellungen",
        metadata: {
          role: def.key,
          label: def.label,
          taskCount: def.tasks.length,
          seedReason,
          ...(logResetFirst !== undefined ? { resetFirst: logResetFirst } : {}),
          ...(def.eventLogMetadata ?? {}),
        } as unknown as Prisma.InputJsonValue,
      },
    });
  });

  const tasks = await prisma.task.findMany({
    where: { userId, title: { in: def.tasks.map((t) => t.title) } },
    select: { id: true, title: true },
  });
  const idByTitle = new Map(tasks.map((t) => [t.title, t.id]));

  const evaluations = isBaseline ? [] : (def.evaluations ?? []);
  const results = [];
  for (const ev of evaluations) {
    const taskId = ev.screen === "task_created" ? idByTitle.get(ev.taskTitle) : undefined;
    const r = await runAdaptiveEngine({
      userId,
      studySessionId: studySessionId ?? null,
      screen: ev.screen,
      taskId,
      metadata: ev.metadata,
    });
    results.push({ screen: ev.screen, taskTitle: ev.taskTitle, ...r });
  }

  const final = isBaseline
    ? { createdCount: 0 }
    : await runAdaptiveEngine({
        userId,
        studySessionId: studySessionId ?? null,
        screen: "/heute",
        metadata: { trigger: "demo_seeded", seedReason },
      });

  return {
    ok: true as const,
    role: def.key,
    createdTasks: def.tasks.length,
    evaluations: results,
    final,
    baseline: isBaseline,
  };
}
