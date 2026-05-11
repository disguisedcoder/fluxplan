import type { Prisma } from "@prisma/client";
import { TaskPriority, TaskStatus } from "@prisma/client";

import { buildGuestMixedTimelineTasks } from "./two-month-timeline";

export type GuestWorkshopCore = {
  tRich: { id: string };
  tMinA: { id: string };
  tMinB: { id: string };
  tBlock1: { id: string };
  tBlock2: { id: string };
  tBlock3: { id: string };
  tRuck: { id: string };
  tSlot: { id: string };
  kalenderCountInTail: number;
  proposedReminder: Date;
  totalEst: number;
};

/**
 * Gemeinsamer Inhalt für **alle** Gast-Sessions (Baseline & Adaptive):
 * Kern-Workshop-Aufgaben, 2-Monats-Timeline, Navigationstrail — **ohne** adaptive Vorschläge.
 */
export async function seedGuestWorkshopSharedContent(
  tx: Prisma.TransactionClient,
  opts: { userId: string; studySessionId: string },
): Promise<GuestWorkshopCore> {
  const { userId, studySessionId } = opts;

  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const eveningSlot = new Date(day.getTime() + 18 * 60 * 60 * 1000);

  const tRich = await tx.task.create({
    data: {
      userId,
      studySessionId,
      title: "Workshop: Große Aufgabe mit allen Details",
      description:
        "Liste, Tags, Dauer und Beschreibung sind ausgefüllt — typisch für etwas, das man vorbereitet und später abhakt.",
      status: TaskStatus.open,
      priority: TaskPriority.high,
      dueDate: day,
      listName: "Studium",
      tags: ["#workshop", "#demo"],
      estimatedMinutes: 60,
      reminderAt: null,
    },
  });

  const [tMinA, tMinB] = await Promise.all([
    tx.task.create({
      data: {
        userId,
        studySessionId,
        title: "Workshop: Kurz notiert (A)",
        status: TaskStatus.open,
        priority: TaskPriority.low,
        dueDate: null,
      },
    }),
    tx.task.create({
      data: {
        userId,
        studySessionId,
        title: "Workshop: Kurz notiert (B)",
        status: TaskStatus.open,
        priority: TaskPriority.low,
        dueDate: null,
      },
    }),
  ]);

  const [tBlock1, tBlock2, tBlock3] = await Promise.all([
    tx.task.create({
      data: {
        userId,
        studySessionId,
        title: "Workshop: Vormittag länger einplanen (1)",
        status: TaskStatus.open,
        priority: TaskPriority.medium,
        dueDate: day,
        estimatedMinutes: 200,
      },
    }),
    tx.task.create({
      data: {
        userId,
        studySessionId,
        title: "Workshop: Vormittag länger einplanen (2)",
        status: TaskStatus.open,
        priority: TaskPriority.medium,
        dueDate: day,
        estimatedMinutes: 200,
      },
    }),
    tx.task.create({
      data: {
        userId,
        studySessionId,
        title: "Workshop: Vormittag länger einplanen (3)",
        status: TaskStatus.open,
        priority: TaskPriority.medium,
        dueDate: day,
        estimatedMinutes: 200,
      },
    }),
  ]);

  const tRuck = await tx.task.create({
    data: {
      userId,
      studySessionId,
      title: "Workshop: Rückmeldung bis heute Abend",
      status: TaskStatus.open,
      priority: TaskPriority.high,
      dueDate: eveningSlot,
      estimatedMinutes: null,
      reminderAt: null,
    },
  });

  const tSlot = await tx.task.create({
    data: {
      userId,
      studySessionId,
      title: "Workshop: Termin heute Nachmittag",
      status: TaskStatus.open,
      priority: TaskPriority.medium,
      dueDate: new Date(day.getTime() + 15 * 60 * 60 * 1000),
      estimatedMinutes: 45,
    },
  });

  const timelineInputs = buildGuestMixedTimelineTasks(day);
  await tx.task.createMany({
    data: timelineInputs.map((t) => ({
      userId,
      studySessionId,
      title: `Workshop: ${t.title}`,
      description: null,
      status: TaskStatus.open,
      priority: (t.priority ?? "medium") as TaskPriority,
      dueDate: t.dueDate ?? null,
      reminderAt: t.reminderAt ?? null,
      listName: t.listName ?? "Workshop",
      tags: [...(t.tags ?? []), "workshop"],
      estimatedMinutes: t.estimatedMinutes ?? null,
    })),
  });

  const viewTo: string[] = [
    "/heute",
    "/kalender",
    "/heute",
    "/aufgaben",
    "/kalender",
    "/kalender",
    "/heute",
    "/kalender",
    "/kalender",
    "/heute",
    "/kalender",
    "/kalender",
  ];
  const baseMs = Date.now() - viewTo.length * 90_000;
  for (let i = 0; i < viewTo.length; i++) {
    const to = viewTo[i]!;
    const from = i > 0 ? viewTo[i - 1]! : null;
    await tx.taskInteraction.create({
      data: {
        userId,
        studySessionId,
        type: "view_changed",
        metadata: {
          from,
          to,
          source: "guest_showcase_navigation",
          order: i,
        } as Prisma.InputJsonValue,
        createdAt: new Date(baseMs + i * 90_000),
      },
    });
  }

  const kalenderCountInTail = viewTo.slice(-8).filter((p) => p === "/kalender").length;
  const proposedReminder = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const totalEst = 200 * 3;

  return {
    tRich: { id: tRich.id },
    tMinA: { id: tMinA.id },
    tMinB: { id: tMinB.id },
    tBlock1: { id: tBlock1.id },
    tBlock2: { id: tBlock2.id },
    tBlock3: { id: tBlock3.id },
    tRuck: { id: tRuck.id },
    tSlot: { id: tSlot.id },
    kalenderCountInTail,
    proposedReminder,
    totalEst,
  };
}

/**
 * Workshop-Gast **adaptiv**: gemeinsamer Kalender-Inhalt + **alle** Regeltypen als **pending** Vorschläge.
 *
 * **Daten zurücksetzen (Gast):** Session wird geleert, **Werk-Preferences** gesetzt, dieser Stand **neu** inkl. aller Vorschläge **pending**.
 */
export async function seedGuestAdaptiveShowcase(
  tx: Prisma.TransactionClient,
  opts: { userId: string; studySessionId: string },
): Promise<void> {
  const { userId, studySessionId } = opts;

  const core = await seedGuestWorkshopSharedContent(tx, opts);

  const drafts: Array<{
    ruleKey: string;
    type: string;
    title: string;
    explanation: string;
    payload: Prisma.InputJsonValue;
  }> = [
    {
      ruleKey: "view_preference",
      type: "start_view",
      title: "Kalender als Startansicht?",
      explanation:
        "Demo (Gast): In den letzten Kern-Navigationen war der Kalender oft im Fokus — du entscheidest wie immer über Annehmen, Nicht jetzt oder Ablehnen.",
      payload: {
        suggestedStartView: "/kalender",
        signal: {
          targetId: "kalender",
          count: core.kalenderCountInTail,
          sampleSize: 8,
          threshold: 3,
          guest: true,
        },
      },
    },
    {
      ruleKey: "adaptive_task_creation",
      type: "task_form_chips",
      title: "Felder schneller hinzufügen?",
      explanation:
        "Demo (Gast): Die Aufgabe „Große Aufgabe mit allen Details“ nutzt Liste, Tags, Dauer und Beschreibung — vorgeschlagene Chips passen dazu; erst nach Annahme wirksam.",
      payload: {
        chipKeys: ["list", "tags", "duration", "description"],
        signal: { guest: true, sampleSize: 4, anchorTaskId: core.tRich.id },
      },
    },
    {
      ruleKey: "adaptive_optional_fold",
      type: "task_form_optional_fold",
      title: "Zusatzfelder zunächst ausblenden?",
      explanation:
        "Demo (Gast): Zwei kurze Einträge stehen neben einer ausführlicheren Aufgabe — typisches Muster für „Formular kompakter“. Du entscheidest.",
      payload: { optionalUsageRate: 0.15, sampleSize: 8, guest: true },
    },
    {
      ruleKey: "adaptive_optional_unfold",
      type: "task_form_optional_unfold",
      title: "Zusatzfelder wieder einblenden?",
      explanation:
        "Demo (Gast): Sobald wieder häufiger mit Kategorie, Tags & Co. gearbeitet wird, lohnt sich die Rückkehr zur vollen Ansicht — du entscheidest.",
      payload: { hadFoldEnabled: true, optionalUsageRate: 0.62, sampleSize: 8 },
    },
    {
      ruleKey: "daily_focus",
      type: "daily_focus",
      title: "Heute könnten diese Aufgaben im Fokus stehen",
      explanation:
        "Demo (Gast): Vorschlag ohne Datenänderung — passend zu Priorität, Rückmeldung und Kalendertag-Last.",
      payload: { taskIds: [core.tRuck.id, core.tRich.id, core.tBlock1.id] },
    },
    {
      ruleKey: "reminder_preference",
      type: "reminder_suggestion",
      title: "Erinnerung vorschlagen?",
      explanation:
        "Demo (Gast): „Rückmeldung“ hat noch keine Erinnerung — nach Annahme setzt FluxPlan den Vorschlag (du kannst ablehnen).",
      payload: {
        taskId: core.tRuck.id,
        proposedReminderAt: core.proposedReminder.toISOString(),
      },
    },
    {
      ruleKey: "calendar_conflict",
      type: "calendar_conflict",
      title: "Möglicher Planungskonflikt",
      explanation:
        "Demo (Gast): Drei große Blöcke am selben Tag + weiterer Slot — Hinweis ohne automatische Verschiebung.",
      payload: {
        taskId: core.tBlock1.id,
        totalEstimatedMinutes: core.totalEst,
        relatedTaskIds: [core.tBlock2.id, core.tBlock3.id, core.tSlot.id],
      },
    },
  ];

  const base = Date.now();
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i]!;
    await tx.adaptiveSuggestion.create({
      data: {
        userId,
        studySessionId,
        ruleKey: d.ruleKey,
        type: d.type,
        title: d.title,
        explanation: d.explanation,
        payload: d.payload,
        status: "pending",
        respondedAt: null,
        createdAt: new Date(base + i * 500),
      },
    });
  }

  await tx.taskInteraction.create({
    data: {
      userId,
      studySessionId,
      type: "engine_evaluated",
      metadata: {
        screen: "/heute",
        reason: "guest_showcase_seeded",
        createdCount: drafts.length,
        taskSummary: {
          richProfile: core.tRich.id,
          calendarBlocks: [core.tBlock1.id, core.tBlock2.id, core.tBlock3.id],
          minimalPair: [core.tMinA.id, core.tMinB.id],
          feedback: core.tRuck.id,
          slot: core.tSlot.id,
        },
      } as Prisma.InputJsonValue,
    },
  });
}
