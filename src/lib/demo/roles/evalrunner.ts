import type { DemoRoleDefinition } from "../types";
import { at } from "../time";

export function evalrunnerRole(now = new Date()): DemoRoleDefinition {
  const tasks = [
    {
      title: "Trigger: View-Wechsel 1",
      priority: "low",
      dueDate: null,
      listName: "Eval",
      tags: ["trigger"],
      estimatedMinutes: 5,
    },
    {
      title: "Trigger: View-Wechsel 2",
      priority: "low",
      dueDate: null,
      listName: "Eval",
      tags: ["trigger"],
      estimatedMinutes: 5,
    },
    {
      title: "Reminder-Aufgabe A",
      priority: "medium",
      dueDate: at(now, 0, 12, 0),
      reminderAt: at(now, 0, 11, 0),
      listName: "Eval",
      tags: ["reminder"],
      estimatedMinutes: 15,
    },
    {
      title: "Reminder-Aufgabe B",
      priority: "medium",
      dueDate: at(now, 1, 12, 0),
      reminderAt: at(now, 1, 11, 0),
      listName: "Eval",
      tags: ["reminder"],
      estimatedMinutes: 15,
    },
    {
      title: "Reminder-Aufgabe C",
      priority: "medium",
      dueDate: at(now, 2, 12, 0),
      reminderAt: at(now, 2, 11, 0),
      listName: "Eval",
      tags: ["reminder"],
      estimatedMinutes: 15,
    },
    {
      title: "Konflikt-Block 1",
      priority: "high",
      dueDate: at(now, 0, 10, 0),
      listName: "Eval",
      tags: ["konflikt"],
      estimatedMinutes: 120,
    },
    {
      title: "Konflikt-Block 2",
      priority: "high",
      dueDate: at(now, 0, 10, 0),
      listName: "Eval",
      tags: ["konflikt"],
      estimatedMinutes: 90,
    },
    {
      title: "Fokus: Wichtige Aufgabe",
      priority: "high",
      dueDate: at(now, 0, 9, 0),
      listName: "Eval",
      tags: ["fokus"],
      estimatedMinutes: 45,
    },
    {
      title: "Export-Check",
      priority: "medium",
      dueDate: at(now, 0, 17, 0),
      listName: "Eval",
      tags: ["export"],
      estimatedMinutes: 10,
    },
    {
      title: "Reset-Check",
      priority: "medium",
      dueDate: at(now, 0, 17, 30),
      listName: "Eval",
      tags: ["reset"],
      estimatedMinutes: 10,
    },
  ] as const;

  return {
    key: "evalrunner",
    label: "Eval-Runner",
    description: "Kleines, reproduzierbares Set für Suggestion-Lifecycle, Konflikte, Export & Reset.",
    tasks: [...tasks],
    viewEvents: [
      { from: "/heute", to: "/kalender" },
      { from: "/kalender", to: "/heute" },
      { from: "/heute", to: "/kalender" },
      { from: "/kalender", to: "/heute" },
      { from: "/heute", to: "/kalender" },
    ],
    preferences: [
      { key: "adaptive.enabled", value: true },
      { key: "adaptive.interventionLevel", value: 2 },
    ],
    evaluations: [
      { screen: "task_created", taskTitle: "Export-Check", metadata: { source: "demo" } },
      { screen: "task_created", taskTitle: "Konflikt-Block 1", metadata: { source: "demo" } },
      { screen: "/heute", taskTitle: "Fokus: Wichtige Aufgabe", metadata: { trigger: "demo" } },
    ],
    eventLogMetadata: { role: "evalrunner", taskCount: 10 },
  };
}

