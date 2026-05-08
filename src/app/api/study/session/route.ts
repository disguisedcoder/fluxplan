import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { setStudyCookies } from "@/lib/auth/study-session";
import { clampInterventionLevel } from "@/lib/settings/intervention-levels";
import { StartStudySessionSchema } from "@/lib/validation/study";
import { isHttpError } from "@/lib/http/errors";

function makeSessionCode(pseudonym: string) {
  const now = new Date();
  const stamp = now
    .toISOString()
    .replaceAll(":", "")
    .replaceAll("-", "")
    .slice(0, 15); // YYYYMMDDTHHMMSS
  return `S-${pseudonym}-${stamp}`;
}

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

    const pseudonym = parsed.data.pseudonym;
    const variant = parsed.data.variant;

    const { user, session } = await prisma.$transaction(async (tx) => {
      const u = await tx.user.upsert({
        where: { pseudonym },
        update: {},
        create: { pseudonym, studyModeEnabled: true },
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
          sessionCode: makeSessionCode(pseudonym),
          variant,
        },
        select: { id: true, sessionCode: true, startedAt: true, variant: true },
      });

      return { user: u, session: s };
    });

    await setStudyCookies({ userId: user.id, sessionId: session.id });

    return NextResponse.json({ user, session });
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

