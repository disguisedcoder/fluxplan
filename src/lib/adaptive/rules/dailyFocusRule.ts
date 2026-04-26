import { prisma } from "@/lib/db/prisma";
import type { AdaptiveRule } from "../types";

export const dailyFocusRule: AdaptiveRule = {
  key: "daily_focus",
  name: "Fokusvorschlag",
  description:
    "Schlägt beim Öffnen der Heute-Ansicht Fokus-Aufgaben vor (ohne automatisch zu priorisieren).",
  async evaluate(ctx) {
    if (ctx.screen !== "/today" && ctx.screen !== "/heute") return null;

    const since = new Date();
    since.setHours(0, 0, 0, 0);

    const existing = await prisma.adaptiveSuggestion.findFirst({
      where: {
        userId: ctx.userId,
        ruleKey: "daily_focus",
        status: "pending",
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (existing) return null;

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const candidates = await prisma.task.findMany({
      where: {
        userId: ctx.userId,
        status: "open",
        OR: [
          { priority: "high" },
          { dueDate: { lte: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000) } },
        ],
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      take: 10,
      select: { id: true, title: true, priority: true, dueDate: true },
    });

    const top = candidates.slice(0, 3);
    if (top.length === 0) return null;

    return {
      ruleKey: "daily_focus",
      type: "daily_focus",
      title: "Heute könnten diese Aufgaben im Fokus stehen",
      explanation:
        "Dieser Vorschlag basiert auf offenen Aufgaben mit hoher Priorität sowie überfälligen oder heutigen Aufgaben.",
      payload: { taskIds: top.map((t) => t.id) },
    };
  },
};

