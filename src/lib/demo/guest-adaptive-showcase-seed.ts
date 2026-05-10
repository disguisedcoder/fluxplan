import type { Prisma } from "@prisma/client";
import { TaskPriority, TaskStatus } from "@prisma/client";

/**
 * Workshop-Gast (G01/G02, adaptiv): konsistente Demo-Daten + **alle** Regeltypen als **pending** Vorschläge,
 * plus Navigation & Aufgaben, die zu den Texten passen. Nach „Daten zurücksetzen“ wird derselbe Stand
 * wiederhergestellt; die **Eingriffsstufe** bleibt beim Session-Reset erhalten (`preserveGuestWorkshopInterventionLevel`).
 */
export async function seedGuestAdaptiveShowcase(
  tx: Prisma.TransactionClient,
  opts: { userId: string; studySessionId: string },
): Promise<void> {
  const { userId, studySessionId } = opts;

  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const eveningSlot = new Date(day.getTime() + 18 * 60 * 60 * 1000);

  const tRich = await tx.task.create({
    data: {
      userId,
      studySessionId,
      title: "Workshop: Aufgabe mit allen Zusatzfeldern",
      description:
        "Liste, Tags, Dauer und Beschreibung sind gesetzt — passt zum Chip-Vorschlag und zum Fokus-Hinweis.",
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
        title: "Workshop: Einfach A (nur Titel)",
        status: TaskStatus.open,
        priority: TaskPriority.low,
        dueDate: null,
      },
    }),
    tx.task.create({
      data: {
        userId,
        studySessionId,
        title: "Workshop: Einfach B (nur Titel)",
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
        title: "Workshop: Kalendertag Block 1 (geschätzt)",
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
        title: "Workshop: Kalendertag Block 2 (geschätzt)",
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
        title: "Workshop: Kalendertag Block 3 (geschätzt)",
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
      title: "Workshop: Rückmeldung (ohne Erinnerung)",
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
      title: "Workshop: Termin-Slot heute Nachmittag",
      status: TaskStatus.open,
      priority: TaskPriority.medium,
      dueDate: new Date(day.getTime() + 15 * 60 * 60 * 1000),
      estimatedMinutes: 45,
    },
  });

  /** Letzte 8 Einträge: viele Wechsel zu `/kalender` — passt zur Startansicht-Vorschau (Gast-Schwellen). */
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
          count: kalenderCountInTail,
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
        "Demo (Gast): Die Aufgabe „…alle Zusatzfeldern“ nutzt Liste, Tags, Dauer und Beschreibung — vorgeschlagene Chips passen dazu; erst nach Annahme wirksam.",
      payload: {
        chipKeys: ["list", "tags", "duration", "description"],
        signal: { guest: true, sampleSize: 4, anchorTaskId: tRich.id },
      },
    },
    {
      ruleKey: "adaptive_optional_fold",
      type: "task_form_optional_fold",
      title: "Zusatzfelder zunächst ausblenden?",
      explanation:
        "Demo (Gast): Zwei sehr kompakte Aufgaben stehen neben ausführlicheren — typisches Muster für „Formular kompakter“. Du entscheidest.",
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
      payload: { taskIds: [tRuck.id, tRich.id, tBlock1.id] },
    },
    {
      ruleKey: "reminder_preference",
      type: "reminder_suggestion",
      title: "Erinnerung vorschlagen?",
      explanation:
        "Demo (Gast): „Rückmeldung“ hat noch keine Erinnerung — nach Annahme setzt FluxPlan den Vorschlag (du kannst ablehnen).",
      payload: {
        taskId: tRuck.id,
        proposedReminderAt: proposedReminder.toISOString(),
      },
    },
    {
      ruleKey: "calendar_conflict",
      type: "calendar_conflict",
      title: "Möglicher Planungskonflikt",
      explanation:
        "Demo (Gast): Drei große Blöcke am selben Tag + weiterer Slot — Hinweis ohne automatische Verschiebung.",
      payload: {
        taskId: tBlock1.id,
        totalEstimatedMinutes: totalEst,
        relatedTaskIds: [tBlock2.id, tBlock3.id, tSlot.id],
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
          richProfile: tRich.id,
          calendarBlocks: [tBlock1.id, tBlock2.id, tBlock3.id],
          minimalPair: [tMinA.id, tMinB.id],
          feedback: tRuck.id,
          slot: tSlot.id,
        },
      } as Prisma.InputJsonValue,
    },
  });
}
