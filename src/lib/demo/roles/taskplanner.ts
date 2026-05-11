import type { DemoRoleDefinition } from "../types";
import { at } from "../time";
import { buildTwoMonthTimelineTasks } from "../two-month-timeline";

export function taskplannerRole(now = new Date()): DemoRoleDefinition {
  const core = [
    {
      title: "Kapitel 2 lesen",
      priority: "high",
      dueDate: at(now, 0, 9, 0),
      listName: "Studium",
      tags: ["literatur"],
      estimatedMinutes: 90,
    },
    {
      title: "Zusammenfassung schreiben",
      priority: "medium",
      dueDate: at(now, 0, 11, 0),
      listName: "Text",
      tags: ["schreiben"],
      estimatedMinutes: 60,
    },
    {
      title: "Interviewfragen überarbeiten",
      priority: "high",
      dueDate: at(now, 1, 10, 0),
      reminderAt: at(now, 1, 9, 15),
      listName: "Research",
      tags: ["interview"],
      estimatedMinutes: 45,
    },
    {
      title: "Mockups vergleichen",
      priority: "medium",
      dueDate: at(now, 2, 14, 0),
      listName: "Prototype",
      tags: ["ui"],
      estimatedMinutes: 60,
    },
    {
      title: "Feedback einarbeiten",
      priority: "high",
      dueDate: at(now, 2, 16, 0),
      listName: "Prototype",
      tags: ["review"],
      estimatedMinutes: 75,
    },
    {
      title: "Tagging-Schema definieren",
      priority: "medium",
      dueDate: null,
      listName: "System",
      tags: ["taxonomy"],
      estimatedMinutes: 30,
    },
    {
      title: "Prioritäten sortieren",
      priority: "low",
      dueDate: at(now, -1, 15, 0),
      listName: "Aufgaben",
      tags: ["cleanup"],
      estimatedMinutes: 25,
    },
    {
      title: "Erinnerung testen",
      priority: "medium",
      dueDate: at(now, 3, 9, 30),
      reminderAt: at(now, 3, 8, 30),
      listName: "Eval",
      tags: ["erinnerung"],
      estimatedMinutes: 20,
    },
    {
      title: "Quick Add Beispiele sammeln",
      priority: "low",
      dueDate: at(now, 4, 12, 0),
      listName: "Eval",
      tags: ["quickadd"],
      estimatedMinutes: 30,
    },
    {
      title: "Export prüfen",
      priority: "medium",
      dueDate: at(now, 5, 10, 0),
      listName: "Eval",
      tags: ["export"],
      estimatedMinutes: 20,
    },
    // additional backlog + decision pressure (stronger study signal)
    {
      title: "Literatur: 3 Quellen markieren",
      priority: "high",
      dueDate: at(now, 0, 13, 30),
      listName: "Studium",
      tags: ["literatur"],
      estimatedMinutes: 45,
    },
    {
      title: "Methodik-Abschnitt skizzieren",
      priority: "high",
      dueDate: at(now, 1, 15, 0),
      listName: "Text",
      tags: ["schreiben"],
      estimatedMinutes: 60,
    },
    {
      title: "Transkript-Notizen ordnen",
      priority: "medium",
      dueDate: at(now, 1, 16, 30),
      listName: "Research",
      tags: ["interview"],
      estimatedMinutes: 35,
    },
    {
      title: "Prototype: Varianten benennen",
      priority: "medium",
      dueDate: at(now, 2, 12, 0),
      listName: "Prototype",
      tags: ["ui"],
      estimatedMinutes: 25,
    },
    {
      title: "Review: 3 Punkte priorisieren",
      priority: "high",
      dueDate: at(now, 2, 18, 0),
      listName: "Prototype",
      tags: ["review"],
      estimatedMinutes: 20,
    },
    {
      title: "Backlog aufräumen (5 Min-Dinger)",
      priority: "low",
      dueDate: null,
      listName: "System",
      tags: ["cleanup"],
      estimatedMinutes: 25,
    },
    {
      title: "Tags vereinheitlichen (Mini-Refactor)",
      priority: "medium",
      dueDate: null,
      listName: "System",
      tags: ["taxonomy"],
      estimatedMinutes: 20,
    },
    {
      title: "Erinnerung: 2 kritische Aufgaben prüfen",
      priority: "medium",
      dueDate: at(now, 0, 8, 30),
      reminderAt: at(now, 0, 8, 0),
      listName: "Eval",
      tags: ["erinnerung"],
      estimatedMinutes: 10,
    },
    {
      title: "Heute: 2 Aufgaben wirklich abschließen",
      priority: "high",
      dueDate: at(now, 0, 17, 30),
      listName: "Studium",
      tags: ["focus"],
      estimatedMinutes: 30,
    },
    {
      title: "Ohne Datum: Ideenparkplatz füllen",
      priority: "low",
      dueDate: null,
      listName: "Backlog",
      tags: ["ideas"],
      estimatedMinutes: 10,
    },
  ] as const;

  const timeline = buildTwoMonthTimelineTasks("taskplanner", now);
  const tasks = [...core, ...timeline];

  return {
    key: "taskplanner",
    label: "Taskplanner",
    description: "Aufgabengetrieben: Prioritäten, Tags/Kategorien, Suche/Filter, Quick-Add & Parser.",
    tasks,
    viewEvents: [
      { from: "/heute", to: "/aufgaben" },
      { from: "/aufgaben", to: "/heute" },
      { from: "/heute", to: "/aufgaben" },
      { from: "/aufgaben", to: "/heute" },
      { from: "/heute", to: "/aufgaben" },
    ],
    preferences: [
      { key: "adaptive.enabled", value: true },
      { key: "adaptive.interventionLevel", value: 2 },
    ],
    evaluations: [
      { screen: "task_created", taskTitle: "Kapitel 2 lesen", metadata: { source: "demo" } },
      { screen: "task_created", taskTitle: "Quick Add Beispiele sammeln", metadata: { source: "demo" } },
    ],
    eventLogMetadata: { role: "taskplanner", taskCount: tasks.length, timelineDays: timeline.length },
  };
}

