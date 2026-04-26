import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { isHttpError } from "@/lib/http/errors";

export async function GET() {
  try {
    const userId = await requireUserId();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      tasksWeekTotal,
      tasksWeekWithDue,
      tasksWeekWithReminder,
      doneWeek,
      pendingSuggestions,
      respondedSuggestions,
      lastEvaluateRow,
    ] = await Promise.all([
      prisma.task.count({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.task.count({
        where: {
          userId,
          createdAt: { gte: sevenDaysAgo },
          dueDate: { not: null },
        },
      }),
      prisma.task.count({
        where: {
          userId,
          createdAt: { gte: sevenDaysAgo },
          reminderAt: { not: null },
        },
      }),
      prisma.task.count({
        where: {
          userId,
          status: "done",
          completedAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.adaptiveSuggestion.count({
        where: { userId, status: "pending" },
      }),
      prisma.adaptiveSuggestion.count({
        where: {
          userId,
          status: { in: ["accepted", "rejected", "snoozed"] },
        },
      }),
      prisma.taskInteraction.findFirst({
        where: { userId, type: "engine_evaluated" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const sharePct = (n: number, total: number) =>
      total === 0 ? 0 : Math.round((n / total) * 100);

    return NextResponse.json({
      window: { days: 7, since: sevenDaysAgo.toISOString() },
      tasks: {
        createdLast7d: tasksWeekTotal,
        completedLast7d: doneWeek,
        withDueDatePct: sharePct(tasksWeekWithDue, tasksWeekTotal),
        withReminderPct: sharePct(tasksWeekWithReminder, tasksWeekTotal),
      },
      suggestions: {
        pending: pendingSuggestions,
        responded: respondedSuggestions,
      },
      engine: {
        lastEvaluatedAt: lastEvaluateRow?.createdAt?.toISOString() ?? null,
      },
    });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
