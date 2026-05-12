import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getStudyCookies } from "@/lib/auth/study-session";
import { isHttpError } from "@/lib/http/errors";
import { isAdminPseudonym } from "@/lib/admin/is-admin";
import { GUEST_STUDY_PSEUDONYMS } from "@/lib/demo/guest-study";

const BodySchema = z.object({
  confirm: z.literal("RESET_GUEST_USERS"),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", hint: 'Body: { "confirm": "RESET_GUEST_USERS" }' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pseudonym: true },
    });
    if (!user || !isAdminPseudonym(user.pseudonym)) {
      return NextResponse.json(
        { error: "forbidden", message: "Keine Berechtigung zum Zurücksetzen der Gast-Konten." },
        { status: 403 },
      );
    }

    const deleted = await prisma.user.deleteMany({
      where: { pseudonym: { in: [...GUEST_STUDY_PSEUDONYMS] } },
    });

    await prisma.eventLog.create({
      data: {
        userId,
        sessionId: sessionId ?? null,
        eventType: "admin_reset_guest_users",
        screen: "/einstellungen",
        metadata: {
          deletedCount: deleted.count,
          pseudonyms: [...GUEST_STUDY_PSEUDONYMS],
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      ok: true,
      deletedUsers: deleted.count,
      clearedPseudonyms: [...GUEST_STUDY_PSEUDONYMS],
    });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
