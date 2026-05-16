import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getStudyCookies } from "@/lib/auth/study-session";
import { whereTasksForActiveStudySession } from "@/lib/data/session-content-delete";
import { isHttpError } from "@/lib/http/errors";
import { topListNamesFromTasks, topTagsFromTasks } from "@/lib/tasks/field-suggestions";

const SAMPLE_SIZE = 400;

export async function GET() {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();
    const scope = whereTasksForActiveStudySession(userId, sessionId);

    const tasks = await prisma.task.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: SAMPLE_SIZE,
      select: { listName: true, tags: true },
    });

    return NextResponse.json({
      listNames: topListNamesFromTasks(tasks),
      tags: topTagsFromTasks(tasks),
    });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
