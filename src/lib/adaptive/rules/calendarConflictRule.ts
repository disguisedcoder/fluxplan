import { prisma } from "@/lib/db/prisma";
import type { AdaptiveRule } from "../types";

export const calendarConflictRule: AdaptiveRule = {
  key: "calendar_conflict",
  name: "Kalender-Konflikthinweis",
  description:
    "Weist auf mögliche Konflikte mit geplanten Zeitfenstern hin (keine automatische Verschiebung).",
  async evaluate(ctx) {
    if (ctx.screen !== "task_created" || !ctx.taskId) return null;

    const task = await prisma.task.findFirst({
      where: { id: ctx.taskId, userId: ctx.userId },
      select: { id: true, title: true, dueDate: true, estimatedMinutes: true },
    });
    if (!task?.dueDate) return null;

    const dayStart = new Date(task.dueDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const sameDay = await prisma.task.findMany({
      where: {
        userId: ctx.userId,
        status: "open",
        dueDate: { gte: dayStart, lt: dayEnd },
        NOT: { id: task.id },
      },
      select: { id: true, estimatedMinutes: true },
    });

    const totalMinutes =
      (task.estimatedMinutes ?? 0) +
      sameDay.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0);

    // Simple, transparent: if we exceed 8h of estimates on the same day, warn.
    if (totalMinutes < 8 * 60) return null;

    const existing = await prisma.adaptiveSuggestion.findFirst({
      where: { userId: ctx.userId, ruleKey: "calendar_conflict", status: "pending" },
      select: { id: true },
    });
    if (existing) return null;

    return {
      ruleKey: "calendar_conflict",
      type: "calendar_conflict",
      title: "Möglicher Planungskonflikt",
      explanation:
        "Dieser Hinweis erscheint, weil die geschätzte Zeit für Aufgaben an diesem Tag recht hoch ist. FluxPlan verschiebt nichts automatisch.",
      payload: { taskId: task.id, totalEstimatedMinutes: totalMinutes },
    };
  },
};

