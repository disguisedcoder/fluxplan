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
import { seedGuestBaselineCalendar } from "@/lib/demo/guest-baseline-calendar-seed";
import { seedGuestAdaptiveShowcase } from "@/lib/demo/guest-adaptive-showcase-seed";
import { applyGuestWorkshopDefaultPreferences } from "@/lib/demo/guest-workshop-default-prefs";
import { isGuestStudyPseudonym } from "@/lib/demo/guest-study";
import { isDemoTestPseudonym } from "@/lib/demo";
import { seedDemoTestSessionOnStart } from "@/lib/demo/seed-demo-test-session";

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

    const guestSessionReseed =
      Boolean(sessionId) &&
      isGuestStudyPseudonym(userRow?.pseudonym) &&
      (sessionVariant === "adaptive" || sessionVariant === "baseline");

    const demoTestSessionReseed =
      Boolean(sessionId) &&
      isDemoTestPseudonym(userRow?.pseudonym) &&
      (sessionVariant === "adaptive" || sessionVariant === "baseline");

    const scope = sessionId ? ("session" as const) : ("user" as const);
    const result = await prisma.$transaction(async (tx) => {
      if (sessionId) {
        return deleteContentForStudySession(tx, userId, sessionId, {
          /** Gast-Reset = vollständiger Workshop-Neuaufbau inkl. Eingriffsstufe-Werk (kein Preserve). */
          preserveGuestWorkshopInterventionLevel: false,
        });
      }
      return deleteAllContentForUser(tx, userId);
    });

    if (guestSessionReseed && sessionId && sessionVariant) {
      await prisma.$transaction(async (tx) => {
        await applyGuestWorkshopDefaultPreferences(tx, { userId, variant: sessionVariant });
        if (sessionVariant === "adaptive") {
          await seedGuestAdaptiveShowcase(tx, { userId, studySessionId: sessionId });
        } else {
          await seedGuestBaselineCalendar(tx, { userId, studySessionId: sessionId });
        }
      });
    } else if (demoTestSessionReseed && sessionId && sessionVariant && userRow?.pseudonym) {
      await seedDemoTestSessionOnStart({
        userId,
        studySessionId: sessionId,
        pseudonym: userRow.pseudonym,
        variant: sessionVariant,
        seedReason: "session_data_reset",
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
