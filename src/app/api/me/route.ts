import { NextResponse } from "next/server";

import { getStudyCookies } from "@/lib/auth/study-session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const { userId, sessionId } = await getStudyCookies();
  if (!userId) return NextResponse.json({ user: null, session: null });

  const [user, session] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pseudonym: true, studyModeEnabled: true, createdAt: true },
    }),
    sessionId
      ? prisma.studySession.findUnique({
          where: { id: sessionId },
          select: { id: true, sessionCode: true, startedAt: true, endedAt: true, variant: true },
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ user, session });
}

