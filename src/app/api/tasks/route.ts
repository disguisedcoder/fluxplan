import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { CreateTaskSchema, TaskPrioritySchema, TaskStatusSchema } from "@/lib/validation/tasks";
import { runAdaptiveEngine } from "@/lib/adaptive/adaptiveEngine";
import { getStudyCookies } from "@/lib/auth/study-session";
import { Prisma } from "@prisma/client";
import { isHttpError } from "@/lib/http/errors";
import { z } from "zod";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);

    const q = url.searchParams.get("q")?.trim() || undefined;
    const parsedStatus = TaskStatusSchema.safeParse(url.searchParams.get("status"));
    const status: z.infer<typeof TaskStatusSchema> | undefined = parsedStatus.success
      ? parsedStatus.data
      : undefined;
    const parsedPriority = TaskPrioritySchema.safeParse(url.searchParams.get("priority"));
    const priority: z.infer<typeof TaskPrioritySchema> | undefined = parsedPriority.success
      ? parsedPriority.data
      : undefined;

    const tasks = await prisma.task.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ tasks });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();
    const body = await req.json().catch(() => null);
    const parsed = CreateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const task = await prisma.task.create({
      data: {
        userId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        priority: parsed.data.priority ?? undefined,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        reminderAt: parsed.data.reminderAt ? new Date(parsed.data.reminderAt) : null,
        listName: parsed.data.listName ?? null,
        tags: parsed.data.tags ?? [],
        estimatedMinutes: parsed.data.estimatedMinutes ?? null,
      },
    });

    await prisma.taskInteraction.create({
      data: {
        userId,
        taskId: task.id,
        type: "task_created",
        metadata: { priority: task.priority, dueDate: task.dueDate },
      },
    });

    await prisma.eventLog.create({
      data: {
        userId,
        sessionId: sessionId ?? null,
        eventType: "task_created",
        screen: "/tasks",
        metadata: { taskId: task.id } as Prisma.InputJsonValue,
      },
    });

    await runAdaptiveEngine({ userId, screen: "task_created", taskId: task.id });

    return NextResponse.json({ task }, { status: 201 });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

