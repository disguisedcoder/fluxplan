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

    const [user, activeSession, sessions, tasks, interactions, suggestions, eventLogs, preferenceRows] =
      await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, pseudonym: true, createdAt: true, studyModeEnabled: true },
      }),
      sessionId
        ? prisma.studySession.findFirst({
            where: { id: sessionId, userId },
            select: { id: true, sessionCode: true, startedAt: true, endedAt: true, variant: true },
          })
        : Promise.resolve(null),
      prisma.studySession.findMany({
        where: { userId },
        orderBy: { startedAt: "asc" },
        select: { id: true, sessionCode: true, startedAt: true, endedAt: true, variant: true },
      }),
      prisma.task.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.taskInteraction.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.adaptiveSuggestion.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.eventLog.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.userPreference.findMany({ where: { userId }, orderBy: { key: "asc" } }),
    ]);

    const exportedAt = new Date().toISOString();

    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const preferences: Record<string, unknown> = {};
    for (const r of preferenceRows) preferences[r.key] = r.value;

    const prefPrimitive = (key: string): boolean | number | null => {
      const v = preferences[key] as unknown;
      if (v == null) return null;
      if (typeof v === "boolean" || typeof v === "number") return v;
      if (typeof v === "object" && v !== null && "value" in (v as Record<string, unknown>)) {
        const inner = (v as Record<string, unknown>).value;
        if (typeof inner === "boolean" || typeof inner === "number") return inner;
      }
      return null;
    };

    const countsBy = <T extends string>(xs: { type: T }[]) =>
      xs.reduce<Record<string, number>>((acc, x) => {
        acc[x.type] = (acc[x.type] ?? 0) + 1;
        return acc;
      }, {});

    const interactionCounts = countsBy(interactions as unknown as { type: string }[]);
    const eventCounts = countsBy(eventLogs.map((e) => ({ type: e.eventType })));

    const totalTasks = tasks.length;
    const openTasks = tasks.filter((t) => t.status !== "done" && t.status !== "archived").length;
    const doneTasks = tasks.filter((t) => t.status === "done").length;

    const suggestionsPending = suggestions.filter((s) => s.status === "pending").length;
    const suggestionsAccepted = interactions.filter((i) => i.type === "suggestion_accepted").length;
    const suggestionsRejected = interactions.filter((i) => i.type === "suggestion_rejected").length;
    const suggestionsSnoozed = interactions.filter((i) => i.type === "suggestion_snoozed").length;
    const suggestionsUndone = interactions.filter((i) => i.type === "suggestion_undone").length;

    const summary = {
      totalTasks,
      openTasks,
      doneTasks,
      createdTasks: interactionCounts["task_created"] ?? 0,
      completedTasks: interactionCounts["task_completed"] ?? 0,
      reopenedTasks: interactionCounts["task_undone"] ?? 0,
      deletedTasks: interactionCounts["task_deleted"] ?? 0,
      filterUsedCount: eventCounts["filter_used"] ?? 0,
      viewChangedCount: eventCounts["view_changed"] ?? 0,
      reminderAddedCount: eventCounts["reminder_added"] ?? 0,
      suggestionSeenCount: eventCounts["suggestion_seen"] ?? 0,
      whyClickedCount: eventCounts["why_clicked"] ?? 0,
      suggestionsPending,
      suggestionsAccepted,
      suggestionsRejected,
      suggestionsSnoozed,
      suggestionsUndone,
      adaptiveEnabled: prefPrimitive("adaptive.enabled"),
      interventionLevel: prefPrimitive("adaptive.interventionLevel"),
      sessionVariant: activeSession?.variant ?? null,
    };

    const baseRow = {
      exportedAt,
      userId,
      userPseudonym: user?.pseudonym ?? null,
      activeSessionId: activeSession?.id ?? null,
      activeSessionCode: activeSession?.sessionCode ?? null,
      activeSessionVariant: activeSession?.variant ?? null,
    };

    const flattenMeta = (m: unknown) => {
      const meta = typeof m === "object" && m !== null ? (m as Record<string, unknown>) : null;
      const flat: Record<string, unknown> = {};
      if (!meta) return flat;
      if (typeof meta.taskTitle === "string") flat.taskTitle = meta.taskTitle;
      if (typeof meta.ruleKey === "string") flat.ruleKey = meta.ruleKey;
      if (typeof meta.action === "string") flat.action = meta.action;
      if (typeof meta.status === "string") flat.status = meta.status;
      if (typeof meta.suggestionId === "string") flat.suggestionId = meta.suggestionId;
      if (typeof meta.taskId === "string") flat.taskId = meta.taskId;
      return flat;
    };

    if (format === "csv") {
      const rows: Record<string, unknown>[] = [
        ...eventLogs.map((e) => {
          const s = e.sessionId ? sessionById.get(e.sessionId) : null;
          return {
            ...baseRow,
            recordType: "event",
            id: e.id,
            sessionId: e.sessionId,
            sessionCode: s?.sessionCode ?? null,
            sessionVariant: s?.variant ?? null,
            eventType: e.eventType,
            screen: e.screen,
            createdAt: e.createdAt.toISOString(),
            metadata: e.metadata,
            ...flattenMeta(e.metadata),
          };
        }),
        ...interactions.map((i) => ({
          ...baseRow,
          recordType: "interaction",
          id: i.id,
          taskId: i.taskId,
          type: i.type,
          createdAt: i.createdAt.toISOString(),
          metadata: i.metadata,
          ...flattenMeta(i.metadata),
        })),
        ...preferenceRows.map((p) => ({
          ...baseRow,
          recordType: "preference",
          key: p.key,
          value: p.value,
        })),
        ...tasks.map((t) => ({
          ...baseRow,
          recordType: "task",
          id: t.id,
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
          ...baseRow,
          recordType: "suggestion",
          id: s.id,
          ruleKey: s.ruleKey,
          type: s.type,
          status: s.status,
          title: s.title,
          explanation: s.explanation,
          payload: s.payload,
          createdAt: s.createdAt.toISOString(),
          respondedAt: s.respondedAt ? s.respondedAt.toISOString() : null,
        })),
        {
          ...baseRow,
          recordType: "summary",
          ...summary,
        },
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
      exportedAt,
      user,
      session: activeSession,
      sessions,
      preferences,
      tasks,
      interactions,
      suggestions,
      eventLogs,
      summary,
    });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

