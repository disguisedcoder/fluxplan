import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { UpdateTaskSchema } from "@/lib/validation/tasks";
import { isHttpError } from "@/lib/http/errors";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const parsed = UpdateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const nextStatus = parsed.data.status ?? existing.status;
    const completedAt =
      nextStatus === "done" && existing.status !== "done"
        ? new Date()
        : nextStatus !== "done"
          ? null
          : existing.completedAt;

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: parsed.data.title ?? undefined,
        description: parsed.data.description === undefined ? undefined : parsed.data.description,
        priority: parsed.data.priority ?? undefined,
        status: nextStatus,
        dueDate: parsed.data.dueDate === undefined ? undefined : parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        reminderAt:
          parsed.data.reminderAt === undefined ? undefined : parsed.data.reminderAt ? new Date(parsed.data.reminderAt) : null,
        listName: parsed.data.listName === undefined ? undefined : parsed.data.listName,
        tags: parsed.data.tags ?? undefined,
        estimatedMinutes:
          parsed.data.estimatedMinutes === undefined ? undefined : parsed.data.estimatedMinutes,
        completedAt,
      },
    });

    const interactionType =
      existing.status !== "done" && task.status === "done"
        ? "task_completed"
        : existing.status === "done" && task.status !== "done"
          ? "task_undone"
          : "task_updated";

    await prisma.taskInteraction.create({
      data: {
        userId,
        taskId: task.id,
        type: interactionType,
        metadata: { from: { status: existing.status }, to: { status: task.status } },
      },
    });

    return NextResponse.json({ task });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;

    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await prisma.task.delete({ where: { id } });
    await prisma.taskInteraction.create({
      data: { userId, taskId: null, type: "task_deleted", metadata: { taskId: id } },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

