import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { isHttpError } from "@/lib/http/errors";

const PreferenceSchema = z.object({
  key: z.string().min(1).max(64),
  value: z.unknown(),
});

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
    const body = await req.json().catch(() => null);
    const parsed = PreferenceSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const value = wrapValue(parsed.data.value);
    const row = await prisma.userPreference.upsert({
      where: { userId_key: { userId, key: parsed.data.key } },
      update: { value: value as Prisma.InputJsonValue },
      create: { userId, key: parsed.data.key, value: value as Prisma.InputJsonValue },
    });

    await prisma.taskInteraction.create({
      data: {
        userId,
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
