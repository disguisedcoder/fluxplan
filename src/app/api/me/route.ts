import { NextResponse } from "next/server";

import { clearFpSessionIdCookie, getStudyCookies, setStudyCookies } from "@/lib/auth/study-session";
import { prisma } from "@/lib/db/prisma";
import { isAdminPseudonym } from "@/lib/admin/is-admin";

const ME_NO_STORE = { "Cache-Control": "private, no-store, max-age=0" } as const;

export async function GET() {
  const { userId, sessionId } = await getStudyCookies();
  if (!userId) {
    return NextResponse.json({ user: null, session: null }, { headers: ME_NO_STORE });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, pseudonym: true, studyModeEnabled: true, createdAt: true },
  });

  let session =
    user && sessionId
      ? await prisma.studySession.findFirst({
          where: { id: sessionId, userId: user.id },
          select: { id: true, sessionCode: true, startedAt: true, endedAt: true, variant: true },
        })
      : null;

  /**
   * Cookie zeigt auf nicht mehr existierende Session (Reset, Seed, anderer Tab mit neuer Session).
   * Wenn der User noch StudySessions hat: neueste Session wieder anbinden — sonst gehen API-Routen
   * ohne `fp_sessionId` fälschlich von „keiner Session“ aus.
   */
  if (user && sessionId && !session) {
    const latest = await prisma.studySession.findFirst({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
      select: { id: true, sessionCode: true, startedAt: true, endedAt: true, variant: true },
    });
    if (latest) {
      await setStudyCookies({ userId: user.id, sessionId: latest.id });
      session = latest;
    } else {
      await clearFpSessionIdCookie();
    }
  }

  return NextResponse.json(
    {
      user,
      session,
      canManageStudyData: user ? isAdminPseudonym(user.pseudonym) : false,
    },
    { headers: ME_NO_STORE },
  );
}

