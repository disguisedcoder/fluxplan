import type { DemoRoleDefinition } from "../types";
import { at } from "../time";

export function taskplannerRole(now = new Date()): DemoRoleDefinition {
  const tasks = [
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
      title: "Reminder-Setup testen",
      priority: "medium",
      dueDate: at(now, 3, 9, 30),
      reminderAt: at(now, 3, 8, 30),
      listName: "Eval",
      tags: ["reminder"],
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
  ] as const;

  return {
    key: "taskplanner",
    label: "Taskplanner",
    description: "Aufgabengetrieben: Prioritäten, Tags/Kategorien, Suche/Filter, Quick-Add & Parser.",
    tasks: [...tasks],
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
    eventLogMetadata: { role: "taskplanner", taskCount: 10 },
  };
}

