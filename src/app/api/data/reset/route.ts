import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getStudyCookies } from "@/lib/auth/study-session";
import { isHttpError } from "@/lib/http/errors";

export async function POST() {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();

    const result = await prisma.$transaction(async (tx) => {
      const tasksDeleted = await tx.task.deleteMany({ where: { userId } });
      const interactionsDeleted = await tx.taskInteraction.deleteMany({ where: { userId } });
      const suggestionsDeleted = await tx.adaptiveSuggestion.deleteMany({ where: { userId } });
      const preferencesDeleted = await tx.userPreference.deleteMany({ where: { userId } });
      return {
        tasks: tasksDeleted.count,
        interactions: interactionsDeleted.count,
        suggestions: suggestionsDeleted.count,
        preferences: preferencesDeleted.count,
      };
    });

    await prisma.eventLog.create({
      data: {
        userId,
        sessionId: sessionId ?? null,
        eventType: "data_reset",
        screen: "/einstellungen",
        metadata: result as unknown as Prisma.InputJsonValue,
      },
    });

    await prisma.taskInteraction.create({
      data: {
        userId,
        type: "data_reset",
        metadata: result as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true, deleted: result });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
