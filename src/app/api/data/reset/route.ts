import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getStudyCookies } from "@/lib/auth/study-session";
import { isHttpError } from "@/lib/http/errors";
import {
  deleteAllContentForUser,
  deleteContentForStudySession,
} from "@/lib/data/session-content-delete";
import { seedGuestAdaptiveShowcase } from "@/lib/demo/guest-adaptive-showcase-seed";
import { isGuestStudyPseudonym } from "@/lib/demo/guest-study";

export async function POST() {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();

    const userRow = await prisma.user.findUnique({ where: { id: userId }, select: { pseudonym: true } });
    let sessionVariant: "baseline" | "adaptive" | null = null;
    if (sessionId) {
      const s = await prisma.studySession.findFirst({
        where: { id: sessionId, userId },
        select: { variant: true },
      });
      sessionVariant = s?.variant ?? null;
    }

    const preserveGuestWorkshop =
      Boolean(sessionId) &&
      sessionVariant === "adaptive" &&
      isGuestStudyPseudonym(userRow?.pseudonym);

    const scope = sessionId ? ("session" as const) : ("user" as const);
    const result = await prisma.$transaction(async (tx) => {
      if (sessionId) {
        return deleteContentForStudySession(tx, userId, sessionId, {
          preserveGuestWorkshopInterventionLevel: preserveGuestWorkshop,
        });
      }
      return deleteAllContentForUser(tx, userId);
    });

    if (preserveGuestWorkshop && sessionId) {
      await prisma.$transaction(async (tx) => {
        await seedGuestAdaptiveShowcase(tx, { userId, studySessionId: sessionId });
      });
    }

    const metadata = { scope, deleted: result } as unknown as Prisma.InputJsonValue;

    await prisma.eventLog.create({
      data: {
        userId,
        sessionId: sessionId ?? null,
        eventType: "data_reset",
        screen: "/einstellungen",
        metadata,
      },
    });

    await prisma.taskInteraction.create({
      data: {
        userId,
        studySessionId: sessionId ?? null,
        type: "data_reset",
        metadata,
      },
    });

    return NextResponse.json({ ok: true, scope, deleted: result });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
