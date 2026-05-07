import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getStudyCookies } from "@/lib/auth/study-session";
import { toCsv } from "@/lib/export/csv";
import { isHttpError } from "@/lib/http/errors";

const FormatSchema = z.enum(["json", "csv"]);

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();
    const url = new URL(req.url);
    const parsedFormat = FormatSchema.safeParse(url.searchParams.get("format"));
    const format: z.infer<typeof FormatSchema> = parsedFormat.success ? parsedFormat.data : "json";

    const [user, session, tasks, interactions, suggestions, eventLogs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, pseudonym: true, createdAt: true, studyModeEnabled: true },
      }),
      sessionId
        ? prisma.studySession.findUnique({
            where: { id: sessionId },
            select: { id: true, sessionCode: true, startedAt: true, endedAt: true, variant: true },
          })
        : Promise.resolve(null),
      prisma.task.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.taskInteraction.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.adaptiveSuggestion.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.eventLog.findMany({
        where: { userId, ...(sessionId ? { sessionId } : {}) },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (format === "csv") {
      const rows: Record<string, unknown>[] = [
        ...eventLogs.map((e) => ({
          recordType: "event",
          id: e.id,
          userId: e.userId,
          sessionId: e.sessionId,
          eventType: e.eventType,
          screen: e.screen,
          createdAt: e.createdAt.toISOString(),
          metadata: e.metadata,
        })),
        ...tasks.map((t) => ({
          recordType: "task",
          id: t.id,
          userId: t.userId,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          reminderAt: t.reminderAt ? t.reminderAt.toISOString() : null,
          listName: t.listName,
          tags: t.tags,
          estimatedMinutes: t.estimatedMinutes,
          createdAt: t.createdAt.toISOString(),
          completedAt: t.completedAt ? t.completedAt.toISOString() : null,
        })),
        ...suggestions.map((s) => ({
          recordType: "suggestion",
          id: s.id,
          userId: s.userId,
          ruleKey: s.ruleKey,
          type: s.type,
          status: s.status,
          title: s.title,
          explanation: s.explanation,
          payload: s.payload,
          createdAt: s.createdAt.toISOString(),
          respondedAt: s.respondedAt ? s.respondedAt.toISOString() : null,
        })),
      ];

      const csv = toCsv(rows);
      return new NextResponse(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": "attachment; filename=\"fluxplan-export.csv\"",
        },
      });
    }

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      user,
      session,
      tasks,
      interactions,
      suggestions,
      eventLogs,
    });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

