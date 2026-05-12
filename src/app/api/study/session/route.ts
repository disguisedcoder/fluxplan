import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { getStudyCookies, setStudyCookies } from "@/lib/auth/study-session";
import { requireUserId } from "@/lib/auth/require-user";
import { clampInterventionLevel } from "@/lib/settings/intervention-levels";
import { StartStudySessionSchema, UpdateStudySessionSchema } from "@/lib/validation/study";
import { HttpError, isHttpError } from "@/lib/http/errors";
import { seedGuestBaselineCalendar } from "@/lib/demo/guest-baseline-calendar-seed";
import { seedGuestAdaptiveShowcase } from "@/lib/demo/guest-adaptive-showcase-seed";
import { applyGuestWorkshopDefaultPreferences } from "@/lib/demo/guest-workshop-default-prefs";
import { allocateGuestPseudonym, isGuestStudyPseudonym } from "@/lib/demo/guest-study";
import { makeStudySessionCode } from "@/lib/study/make-session-code";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = StartStudySessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const variant = parsed.data.variant;
    const isGuest = "guest" in parsed.data && parsed.data.guest === true;
    const namedPseudonym = "pseudonym" in parsed.data ? parsed.data.pseudonym : null;

    const { user, session } = await prisma.$transaction(async (tx) => {
      const pseudonym = isGuest
        ? await allocateGuestPseudonym(tx)
        : namedPseudonym!;
      if (isGuest && !pseudonym) {
        throw new HttpError(
          409,
          "Beide Gast-Codes (G01, G02) sind bereits angelegt. Bitte einen eigenen User-Code nutzen.",
        );
      }
      const resolvedPseudonym = pseudonym!;

      const u = await tx.user.upsert({
        where: { pseudonym: resolvedPseudonym },
        update: {},
        create: { pseudonym: resolvedPseudonym, studyModeEnabled: true },
        select: { id: true, pseudonym: true, studyModeEnabled: true, createdAt: true },
      });

      if (variant === "baseline") {
        await tx.userPreference.upsert({
          where: { userId_key: { userId: u.id, key: "adaptive.enabled" } },
          update: { value: prefPrimitive(false) },
          create: { userId: u.id, key: "adaptive.enabled", value: prefPrimitive(false) },
        });
      } else {
        // adaptive (default)
        const level = clampInterventionLevel(parsed.data.interventionLevel ?? 2);
        await tx.userPreference.upsert({
          where: { userId_key: { userId: u.id, key: "adaptive.enabled" } },
          update: { value: prefPrimitive(true) },
          create: { userId: u.id, key: "adaptive.enabled", value: prefPrimitive(true) },
        });
        await tx.userPreference.upsert({
          where: { userId_key: { userId: u.id, key: "adaptive.interventionLevel" } },
          update: { value: prefPrimitive(level) },
          create: { userId: u.id, key: "adaptive.interventionLevel", value: prefPrimitive(level) },
        });
      }

      const s = await tx.studySession.create({
        data: {
          userId: u.id,
          sessionCode: makeStudySessionCode(resolvedPseudonym),
          variant,
        },
        select: { id: true, sessionCode: true, startedAt: true, variant: true },
      });

      if (isGuest && variant === "adaptive") {
        await seedGuestAdaptiveShowcase(tx, { userId: u.id, studySessionId: s.id });
      } else if (isGuest && variant === "baseline") {
        await seedGuestBaselineCalendar(tx, { userId: u.id, studySessionId: s.id });
      }

      return { user: u, session: s };
    });

    await setStudyCookies({ userId: user.id, sessionId: session.id });

    return NextResponse.json({ user, session });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 409)
      return NextResponse.json({ error: "guest_slots_full", message: e.message }, { status: 409 });
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { error: "db_unavailable", hint: "PostgreSQL/DATABASE_URL nicht erreichbar. Starte z. B. `docker compose up -d`." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();
    if (!sessionId) {
      return NextResponse.json({ error: "no_active_session" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = UpdateStudySessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const owned = await prisma.studySession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "session_not_found" }, { status: 404 });
    }

    const existingSession = await prisma.studySession.findFirst({
      where: { id: sessionId, userId },
      select: { variant: true },
    });

    const variant = parsed.data.variant;

    const session = await prisma.$transaction(async (tx) => {
      if (variant === "baseline") {
        await tx.userPreference.upsert({
          where: { userId_key: { userId, key: "adaptive.enabled" } },
          update: { value: prefPrimitive(false) },
          create: { userId, key: "adaptive.enabled", value: prefPrimitive(false) },
        });
      } else {
        const level = clampInterventionLevel(parsed.data.interventionLevel ?? 2);
        await tx.userPreference.upsert({
          where: { userId_key: { userId, key: "adaptive.enabled" } },
          update: { value: prefPrimitive(true) },
          create: { userId, key: "adaptive.enabled", value: prefPrimitive(true) },
        });
        await tx.userPreference.upsert({
          where: { userId_key: { userId, key: "adaptive.interventionLevel" } },
          update: { value: prefPrimitive(level) },
          create: { userId, key: "adaptive.interventionLevel", value: prefPrimitive(level) },
        });
      }

      return tx.studySession.update({
        where: { id: sessionId },
        data: { variant },
        select: { id: true, sessionCode: true, startedAt: true, variant: true },
      });
    });

    const patchLevel = parsed.data.interventionLevel;

    if (variant === "adaptive") {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { pseudonym: true } });
      if (isGuestStudyPseudonym(u?.pseudonym)) {
        const wasBaseline = existingSession?.variant === "baseline";
        if (wasBaseline) {
          const taskCount = await prisma.task.count({ where: { userId, studySessionId: sessionId } });
          await prisma.$transaction(async (tx) => {
            await applyGuestWorkshopDefaultPreferences(tx, {
              userId,
              variant: "adaptive",
              interventionLevel: patchLevel,
            });
            if (taskCount === 0) {
              await seedGuestAdaptiveShowcase(tx, { userId, studySessionId: sessionId });
            }
          });
        } else {
          const taskCount = await prisma.task.count({ where: { userId, studySessionId: sessionId } });
          if (taskCount === 0) {
            await prisma.$transaction((tx) =>
              seedGuestAdaptiveShowcase(tx, { userId, studySessionId: sessionId }),
            );
          }
        }
      }
    }

    if (variant === "baseline") {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { pseudonym: true } });
      if (isGuestStudyPseudonym(u?.pseudonym) && existingSession?.variant === "adaptive") {
        const taskCount = await prisma.task.count({ where: { userId, studySessionId: sessionId } });
        await prisma.$transaction(async (tx) => {
          await applyGuestWorkshopDefaultPreferences(tx, { userId, variant: "baseline" });
          if (taskCount === 0) {
            await seedGuestBaselineCalendar(tx, { userId, studySessionId: sessionId });
          }
        });
      }
    }

    await prisma.taskInteraction.create({
      data: {
        userId,
        studySessionId: sessionId,
        type: "session_variant_updated",
        metadata: { variant, sessionId } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ session });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (isDbUnavailableError(e)) {
      return NextResponse.json(
        { error: "db_unavailable", hint: "PostgreSQL/DATABASE_URL nicht erreichbar. Starte z. B. `docker compose up -d`." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

function prefPrimitive(v: boolean | number): Prisma.InputJsonValue {
  return { value: v } as Prisma.InputJsonValue;
}

function isDbUnavailableError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const any = e as { name?: unknown; message?: unknown };
  const name = typeof any.name === "string" ? any.name : "";
  const msg = typeof any.message === "string" ? any.message : "";
  return (
    name.includes("PrismaClientInitializationError") ||
    msg.includes("Can't reach database server") ||
    msg.includes("ECONNREFUSED")
  );
}

