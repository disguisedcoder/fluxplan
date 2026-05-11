import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getStudyCookies } from "@/lib/auth/study-session";
import { isHttpError } from "@/lib/http/errors";
import {
  deleteAllContentForUser,
  deleteContentForStudySession,
} from "@/lib/data/session-content-delete";
import { roleFromPseudonym } from "@/lib/demo";
import type { DemoRoleKey } from "@/lib/demo/types";
import { ensureDefaultAdaptiveRules, seedRoleDemoContent } from "@/lib/demo/seed-role-demo-content";

const DemoSchema = z.object({
  role: z.enum(["familienplanner", "taskplanner", "evalrunner"]).optional(),
  resetFirst: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();
    const body = await req.json().catch(() => ({}));
    const parsed = DemoSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    await ensureDefaultAdaptiveRules();

    const session =
      sessionId
        ? await prisma.studySession.findFirst({
            where: { id: sessionId, userId },
            select: { variant: true },
          })
        : null;
    const isBaseline = session?.variant === "baseline";

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pseudonym: true },
    });
    const pseudonym = user?.pseudonym ?? "P??";

    const roleKey: DemoRoleKey = parsed.data.role ?? roleFromPseudonym(pseudonym);
    const resetFirst = parsed.data.resetFirst ?? true;

    if (resetFirst) {
      await prisma.$transaction(async (tx) => {
        if (sessionId) {
          await deleteContentForStudySession(tx, userId, sessionId, {
            /** Gast-Demo mit Reset: vollständig neu wie „Daten zurücksetzen“ (kein Preserve der Eingriffsstufe). */
            preserveGuestWorkshopInterventionLevel: false,
          });
        } else {
          await deleteAllContentForUser(tx, userId);
        }
      });
    }

    const payload = await seedRoleDemoContent({
      userId,
      studySessionId: sessionId ?? null,
      roleKey,
      isBaseline,
      seedReason: "demo_request",
      logResetFirst: resetFirst,
    });

    return NextResponse.json(payload);
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
