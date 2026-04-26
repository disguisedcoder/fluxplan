import { prisma } from "@/lib/db/prisma";
import type { AdaptiveRule } from "../types";
import { thresholdMultiplier } from "../engineConfig";

export const reminderPreferenceRule: AdaptiveRule = {
  key: "reminder_preference",
  name: "Reminder-Präferenz",
  description:
    "Schlägt bei ähnlichen Aufgaben einen Reminder vor, wenn du das oft tust.",
  async evaluate(ctx) {
    if (ctx.screen !== "task_created" || !ctx.taskId) return null;

    const existing = await prisma.adaptiveSuggestion.findFirst({
      where: {
        userId: ctx.userId,
        ruleKey: "reminder_preference",
        status: "pending",
        payload: { path: ["taskId"], equals: ctx.taskId },
      },
      select: { id: true },
    });
    if (existing) return null;

    const task = await prisma.task.findFirst({
      where: { id: ctx.taskId, userId: ctx.userId },
      select: { id: true, title: true, dueDate: true, reminderAt: true, listName: true },
    });
    if (!task || task.reminderAt) return null;

    const recentWithReminders = await prisma.task.findMany({
      where: {
        userId: ctx.userId,
        reminderAt: { not: null },
        ...(task.listName ? { listName: task.listName } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { reminderAt: true },
    });

    const baseThreshold = 3;
    const mult = ctx.config ? thresholdMultiplier(ctx.config) : 1;
    const threshold = Math.max(2, Math.ceil(baseThreshold * mult));
    if (recentWithReminders.length < threshold) return null;

    const proposed =
      task.dueDate != null
        ? new Date(new Date(task.dueDate).getTime() - 2 * 60 * 60 * 1000)
        : new Date(Date.now() + 60 * 60 * 1000);

    return {
      ruleKey: "reminder_preference",
      type: "reminder_suggestion",
      title: "Reminder vorschlagen?",
      explanation:
        "Dieser Vorschlag basiert auf deinen zuletzt erstellten Aufgaben, bei denen du häufig eine Erinnerung gesetzt hast.",
      payload: { taskId: task.id, proposedReminderAt: proposed.toISOString() },
    };
  },
};

