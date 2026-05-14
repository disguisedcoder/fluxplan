import type { PrismaClient } from "@prisma/client";
import { TaskPriority, TaskStatus } from "@prisma/client";

import { runAdaptiveEngine } from "@/lib/adaptive/adaptiveEngine";
import { makeStudySessionCode } from "@/lib/study/make-session-code";

import { getDemoRole, roleFromPseudonym } from "./index";
import { DEMO_TEST_PSEUDONYMS } from "./test-pseudonyms";

export async function ensureAdaptiveRules(prisma: PrismaClient) {
  await prisma.adaptiveRule.createMany({
    data: [
      {
        key: "view_preference",
        name: "Ansichtspräferenz",
        description:
          "Schlägt vor, eine häufig genutzte Ansicht als Startansicht zu setzen.",
        enabled: true,
      },
      {
        key: "reminder_preference",
        name: "Erinnerungs-Präferenz",
        description:
          "Schlägt bei ähnlichen Aufgaben eine Erinnerung vor, wenn du das oft tust.",
        enabled: true,
      },
      {
        key: "daily_focus",
        name: "Fokusvorschlag",
        description:
          "Schlägt beim Öffnen der Heute-Ansicht Fokus-Aufgaben vor (ohne automatisch zu priorisieren).",
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
        description:
          "Hält das Formular zuerst einfach und schlägt Zusatzfelder als Chips vor.",
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

export async function seedDemoTestUsers(prisma: PrismaClient, now = new Date()) {
  for (const pseudonym of DEMO_TEST_PSEUDONYMS) {
    const user = await prisma.user.upsert({
      where: { pseudonym },
      update: {},
      create: { pseudonym, studyModeEnabled: true },
      select: { id: true, pseudonym: true },
    });

    await prisma.$transaction([
      prisma.eventLog.deleteMany({ where: { userId: user.id } }),
      prisma.studySession.deleteMany({ where: { userId: user.id } }),
      prisma.adaptiveSuggestion.deleteMany({ where: { userId: user.id } }),
      prisma.taskInteraction.deleteMany({ where: { userId: user.id } }),
      prisma.task.deleteMany({ where: { userId: user.id } }),
      prisma.userPreference.deleteMany({ where: { userId: user.id } }),
    ]);

    const def = getDemoRole(roleFromPseudonym(pseudonym), now);

    await prisma.userPreference.createMany({
      data: [
        { userId: user.id, key: "adaptive.enabled", value: { value: true } },
        { userId: user.id, key: "adaptive.interventionLevel", value: { value: 2 } },
      ],
      skipDuplicates: true,
    });

    await prisma.task.createMany({
      data: def.tasks.map((t) => ({
        userId: user.id,
        title: `${pseudonym}: ${t.title}`,
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

    await prisma.studySession
      .create({
        data: {
          userId: user.id,
          sessionCode: makeStudySessionCode(pseudonym),
          variant: "adaptive",
          notes: `Seed-Testuser (${def.key})`,
        },
      })
      .catch(() => {});

    if (def.viewEvents?.length) {
      await prisma.taskInteraction.createMany({
        data: def.viewEvents.map((e, idx) => ({
          userId: user.id,
          type: "view_changed",
          metadata: { from: e.from ?? null, to: e.to, source: "seed", order: idx },
        })),
      });
    }

    await prisma.eventLog.create({
      data: {
        userId: user.id,
        eventType: "seed_initialized",
        screen: "system",
        metadata: { role: def.key, tasksCreated: def.tasks.length },
      },
    });

    /** Erster passender Pending-Vorschlag (z. B. daily_focus) für alle Studien-Codes — gleiches Verhalten F/T/E/P. */
    try {
      const latestSession = await prisma.studySession.findFirst({
        where: { userId: user.id },
        orderBy: { startedAt: "desc" },
        select: { id: true },
      });
      await runAdaptiveEngine({
        userId: user.id,
        studySessionId: latestSession?.id ?? null,
        screen: "/heute",
        metadata: { trigger: "seed_initialized" },
      });
    } catch (err) {
      console.warn(`seedDemoTestUsers: runAdaptiveEngine failed for ${pseudonym}:`, err);
    }
  }
}
