import "dotenv/config";
import { PrismaClient, TaskPriority, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { pseudonym: "P01" },
    update: {},
    create: { pseudonym: "P01", studyModeEnabled: true },
  });

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
        name: "Reminder-Präferenz",
        description:
          "Schlägt bei ähnlichen Aufgaben einen Reminder vor, wenn du das oft tust.",
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
          "Weist auf mögliche Konflikte mit geplanten Zeitfenstern hin (keine automatische Verschiebung).",
        enabled: true,
      },
      {
        key: "adaptive_task_creation",
        name: "Adaptives Aufgabenformular",
        description:
          "Hält das Formular zuerst einfach und schlägt Zusatzfelder als Chips vor.",
        enabled: true,
      },
    ],
    skipDuplicates: true,
  });

  const now = new Date();
  const at = (offsetDays: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setDate(now.getDate() + offsetDays);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const seedTasks = [
    {
      userId: user.id,
      title: "Bachelorarbeit gliedern",
      status: TaskStatus.open,
      priority: TaskPriority.high,
      dueDate: at(0, 9, 0),
      listName: "Studium",
      tags: ["bachelorarbeit"],
      estimatedMinutes: 90,
    },
    {
      userId: user.id,
      title: "State of the Art nachziehen",
      status: TaskStatus.open,
      priority: TaskPriority.medium,
      dueDate: at(0, 11, 0),
      listName: "Research",
      tags: ["literatur"],
      estimatedMinutes: 60,
    },
    {
      userId: user.id,
      title: "Mockup-Briefing schärfen",
      status: TaskStatus.open,
      priority: TaskPriority.medium,
      dueDate: at(0, 14, 0),
      listName: "Prototype",
      tags: ["fluxplan"],
      estimatedMinutes: 60,
    },
    {
      userId: user.id,
      title: "Betreuernotizen abgleichen",
      status: TaskStatus.open,
      priority: TaskPriority.low,
      dueDate: at(1, 10, 0),
      listName: "Review",
      tags: ["qg"],
      estimatedMinutes: 30,
    },
    {
      userId: user.id,
      title: "Methodikteil finalisieren",
      status: TaskStatus.open,
      priority: TaskPriority.high,
      dueDate: at(-1, 9, 0),
      listName: "Studium",
      tags: ["bachelorarbeit"],
      estimatedMinutes: 45,
    },
    {
      userId: user.id,
      title: "Interviewleitfaden prüfen",
      status: TaskStatus.open,
      priority: TaskPriority.high,
      dueDate: at(0, 16, 0),
      reminderAt: at(0, 15, 30),
      listName: "Research",
      tags: ["recherche"],
      estimatedMinutes: 30,
    },
    {
      userId: user.id,
      title: "Apple Erinnerungen prüfen",
      status: TaskStatus.open,
      priority: TaskPriority.low,
      dueDate: null,
      listName: "Apps",
      tags: [],
      estimatedMinutes: 15,
    },
    {
      userId: user.id,
      title: "Diskussion entwerfen",
      status: TaskStatus.open,
      priority: TaskPriority.low,
      dueDate: null,
      listName: "Text",
      tags: ["schreiben"],
      estimatedMinutes: 60,
    },
    {
      userId: user.id,
      title: "Fokus-Block: Heute Mittag",
      status: TaskStatus.open,
      priority: TaskPriority.medium,
      dueDate: at(0, 13, 0),
      listName: "Studium",
      tags: [],
      estimatedMinutes: 90,
    },
    {
      userId: user.id,
      title: "Coding-Review FluxPlan",
      status: TaskStatus.open,
      priority: TaskPriority.medium,
      dueDate: at(2, 15, 0),
      listName: "Prototype",
      tags: ["review"],
      estimatedMinutes: 60,
    },
  ];

  await prisma.task.createMany({ data: seedTasks, skipDuplicates: true });

  const tasks = await prisma.task.findMany({
    where: { userId: user.id, title: { in: seedTasks.map((t) => t.title) } },
    orderBy: { createdAt: "asc" },
  });

  await prisma.studySession.createMany({
    data: [
      {
        userId: user.id,
        sessionCode: "S-DEMO-001",
        variant: "adaptive",
        notes: "Seed-Demo-Session",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.userPreference.createMany({
    data: [
      {
        userId: user.id,
        key: "adaptive.enabled",
        value: { value: true },
      },
      {
        userId: user.id,
        key: "adaptive.interventionLevel",
        value: { value: 2 },
      },
    ],
    skipDuplicates: true,
  });

  await prisma.eventLog.create({
    data: {
      userId: user.id,
      eventType: "seed_initialized",
      screen: "system",
      metadata: { tasksCreated: tasks.length },
    },
  });

  await prisma.adaptiveSuggestion.createMany({
    data: [
      {
        userId: user.id,
        ruleKey: "view_preference",
        type: "start_view",
        title: "Kalenderansicht bevorzugen?",
        explanation:
          "Dieser Vorschlag erscheint, weil du in letzter Zeit häufig zur Kalenderansicht gewechselt hast.",
        payload: { suggestedStartView: "/kalender" },
      },
      {
        userId: user.id,
        ruleKey: "daily_focus",
        type: "daily_focus",
        title: "Heute könnten diese 3 Aufgaben im Fokus stehen",
        explanation:
          "Dieser Vorschlag basiert auf offenen Aufgaben mit hoher Priorität sowie überfälligen oder heutigen Aufgaben.",
        payload: { taskIds: tasks.slice(0, 3).map((t) => t.id) },
      },
      {
        userId: user.id,
        ruleKey: "reminder_preference",
        type: "reminder_suggestion",
        title: "Erinnerung 15 Minuten vorher anlegen?",
        explanation:
          "In den letzten Aufgaben hast du häufig Erinnerungen gesetzt. Dieser Vorschlag erscheint nur als Hinweis.",
        payload: { taskId: tasks[5]?.id, proposedReminderAt: at(0, 15, 45).toISOString() },
        status: "accepted",
        respondedAt: at(-2, 14, 0),
      },
      {
        userId: user.id,
        ruleKey: "calendar_conflict",
        type: "calendar_conflict",
        title: "Möglicher Planungskonflikt",
        explanation:
          "Dieser Hinweis erscheint, weil die geschätzte Zeit für Aufgaben an diesem Tag recht hoch ist. FluxPlan verschiebt nichts automatisch.",
        payload: { totalEstimatedMinutes: 540 },
        status: "rejected",
        respondedAt: at(-3, 11, 0),
      },
      {
        userId: user.id,
        ruleKey: "adaptive_task_creation",
        type: "task_form_chips",
        title: "Felder schneller hinzufügen?",
        explanation:
          "Du hast zuletzt häufig Datum und Erinnerung genutzt. Diese Felder können als Chips erscheinen.",
        payload: { suggestedChips: ["dueDate", "reminderAt"] },
        status: "snoozed",
        respondedAt: at(0, 9, 30),
      },
    ],
  });

  await prisma.taskInteraction.createMany({
    data: [
      {
        userId: user.id,
        type: "view_changed",
        metadata: { to: "/kalender" },
      },
      {
        userId: user.id,
        type: "view_changed",
        metadata: { to: "/kalender" },
      },
      {
        userId: user.id,
        type: "view_changed",
        metadata: { to: "/heute" },
      },
      {
        userId: user.id,
        taskId: tasks[0]?.id,
        type: "task_created",
        metadata: { source: "seed" },
      },
      {
        userId: user.id,
        type: "suggestion_seen",
        metadata: { ruleKey: "daily_focus" },
      },
      {
        userId: user.id,
        type: "preference_changed",
        metadata: { key: "adaptive.interventionLevel", value: { value: 2 } },
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
