import type { DemoRoleDefinition } from "../types";
import { at } from "../time";

export function familienplannerRole(now = new Date()): DemoRoleDefinition {
  const tasks = [
    {
      title: "Kita-Abholung organisieren",
      priority: "high",
      dueDate: at(now, 0, 16, 30),
      reminderAt: at(now, 0, 16, 0),
      listName: "Familie",
      tags: ["kita"],
      estimatedMinutes: 20,
    },
    {
      title: "Wocheneinkauf planen",
      priority: "medium",
      dueDate: at(now, 0, 18, 0),
      reminderAt: at(now, 0, 17, 0),
      listName: "Haushalt",
      tags: ["einkauf"],
      estimatedMinutes: 45,
    },
    {
      title: "Kinderarzt-Termin bestätigen",
      priority: "high",
      dueDate: at(now, 1, 9, 30),
      reminderAt: at(now, 1, 9, 0),
      listName: "Familie",
      tags: ["gesundheit"],
      estimatedMinutes: 15,
    },
    // conflict pair (same time window)
    {
      title: "Elternabend vorbereiten",
      priority: "medium",
      dueDate: at(now, 2, 19, 0),
      listName: "Familie",
      tags: ["schule"],
      estimatedMinutes: 90,
    },
    {
      title: "Sporttasche packen",
      priority: "medium",
      dueDate: at(now, 2, 19, 0),
      listName: "Familie",
      tags: ["organisation"],
      estimatedMinutes: 30,
    },
    // conflict-by-estimate (>= 8h same day)
    {
      title: "Geburtstagsfeier planen",
      priority: "high",
      dueDate: at(now, 3, 10, 0),
      listName: "Familie",
      tags: ["geburtstag"],
      estimatedMinutes: 240,
    },
    {
      title: "Einladungen schreiben",
      priority: "medium",
      dueDate: at(now, 3, 13, 0),
      listName: "Familie",
      tags: ["geburtstag"],
      estimatedMinutes: 120,
    },
    {
      title: "Deko & Snacks besorgen",
      priority: "medium",
      dueDate: at(now, 3, 15, 0),
      listName: "Haushalt",
      tags: ["geburtstag", "einkauf"],
      estimatedMinutes: 180,
    },
    {
      title: "Spiele auswählen",
      priority: "low",
      dueDate: at(now, 3, 16, 30),
      listName: "Familie",
      tags: ["geburtstag"],
      estimatedMinutes: 90,
    },
    // unplanned (no date) to populate unplanned list
    {
      title: "Wunschliste für Ferien sammeln",
      priority: "low",
      dueDate: null,
      listName: "Familie",
      tags: ["ferien"],
      estimatedMinutes: 30,
    },
  ] as const;

  return {
    key: "familienplanner",
    label: "Familienplanner",
    description: "Kalendernah, Termine und Konflikte, Reminder-Muster und Ansichtswechsel.",
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
      { screen: "task_created", taskTitle: "Geburtstagsfeier planen", metadata: { source: "demo" } },
      { screen: "/heute", taskTitle: "Kita-Abholung organisieren", metadata: { trigger: "demo" } },
    ],
    eventLogMetadata: { role: "familienplanner", taskCount: 10 },
  };
}

