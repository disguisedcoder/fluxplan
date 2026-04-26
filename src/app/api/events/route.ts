import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getStudyCookies } from "@/lib/auth/study-session";
import { isHttpError } from "@/lib/http/errors";

const EventSchema = z.object({
  eventType: z.string().min(1).max(64),
  screen: z.string().min(1).max(64),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();
    const body = await req.json().catch(() => null);
    const parsed = EventSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const event = await prisma.eventLog.create({
      data: {
        userId,
        sessionId: sessionId ?? null,
        eventType: parsed.data.eventType,
        screen: parsed.data.screen,
        metadata: (parsed.data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

