import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { setStudyCookies } from "@/lib/auth/study-session";
import { StartStudySessionSchema } from "@/lib/validation/study";

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
  const body = await req.json().catch(() => null);
  const parsed = StartStudySessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const pseudonym = parsed.data.pseudonym;

  const user = await prisma.user.upsert({
    where: { pseudonym },
    update: {},
    create: { pseudonym, studyModeEnabled: true },
    select: { id: true, pseudonym: true, studyModeEnabled: true, createdAt: true },
  });

  const session = await prisma.studySession.create({
    data: {
      userId: user.id,
      sessionCode: makeSessionCode(pseudonym),
      variant: parsed.data.variant,
    },
    select: { id: true, sessionCode: true, startedAt: true, variant: true },
  });

  await setStudyCookies({ userId: user.id, sessionId: session.id });

  return NextResponse.json({ user, session });
}

