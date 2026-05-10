import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getStudyCookies } from "@/lib/auth/study-session";
import { isHttpError } from "@/lib/http/errors";
import {
  REMINDER_SNOOZE_DAYS_PREF_KEY,
  REMINDER_SNOOZE_UNTIL_PREF_KEY,
  addLocalCalendarDays,
  readReminderSnoozeDaysPref,
  readReminderSuggestionSnoozeUntil,
} from "@/lib/settings/reminder-snooze";

const PreferenceSchema = z.object({
  key: z.string().min(1).max(64),
  value: z.unknown(),
});

const PREFERENCE_DELETE_NULL_OK = new Set<string>([REMINDER_SNOOZE_UNTIL_PREF_KEY]);

export async function GET() {
  try {
    const userId = await requireUserId();
    const rows = await prisma.userPreference.findMany({
      where: { userId },
      orderBy: { key: "asc" },
    });
    const preferences: Record<string, unknown> = {};
    for (const r of rows) preferences[r.key] = r.value;
    return NextResponse.json({ preferences });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();
    const body = await req.json().catch(() => null);
    const parsed = PreferenceSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    if (parsed.data.value === null) {
      if (!PREFERENCE_DELETE_NULL_OK.has(parsed.data.key)) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }
      await prisma.userPreference.deleteMany({
        where: { userId, key: parsed.data.key },
      });
      await prisma.taskInteraction.create({
        data: {
          userId,
          studySessionId: sessionId ?? null,
          type: "preference_changed",
          metadata: { key: parsed.data.key, deleted: true } as Prisma.InputJsonValue,
        },
      });
      return NextResponse.json({ ok: true, deleted: true });
    }

    const value = wrapValue(parsed.data.value);
    const row = await prisma.userPreference.upsert({
      where: { userId_key: { userId, key: parsed.data.key } },
      update: { value: value as Prisma.InputJsonValue },
      create: { userId, key: parsed.data.key, value: value as Prisma.InputJsonValue },
    });

    if (parsed.data.key === REMINDER_SNOOZE_DAYS_PREF_KEY) {
      const days = readReminderSnoozeDaysPref(row.value);
      const untilRow = await prisma.userPreference.findUnique({
        where: { userId_key: { userId, key: REMINDER_SNOOZE_UNTIL_PREF_KEY } },
        select: { value: true },
      });
      const existingUntil = readReminderSuggestionSnoozeUntil(untilRow?.value);
      if (existingUntil && existingUntil.getTime() > Date.now()) {
        const fresh = addLocalCalendarDays(new Date(), days);
        await prisma.userPreference.upsert({
          where: { userId_key: { userId, key: REMINDER_SNOOZE_UNTIL_PREF_KEY } },
          update: { value: { until: fresh.toISOString() } as Prisma.InputJsonValue },
          create: {
            userId,
            key: REMINDER_SNOOZE_UNTIL_PREF_KEY,
            value: { until: fresh.toISOString() } as Prisma.InputJsonValue,
          },
        });
      }
    }

    await prisma.taskInteraction.create({
      data: {
        userId,
        studySessionId: sessionId ?? null,
        type: "preference_changed",
        metadata: { key: row.key, value } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ preference: row });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

function wrapValue(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") return v;
  return { value: v };
}
