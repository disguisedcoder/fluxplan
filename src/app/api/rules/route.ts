import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { Prisma } from "@prisma/client";
import { isHttpError } from "@/lib/http/errors";

const UpdateRuleSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
});

export async function GET() {
  try {
    await requireUserId(); // keeps access consistent with the rest of the app
    const rules = await prisma.adaptiveRule.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ rules });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = UpdateRuleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const updated = await prisma.adaptiveRule.update({
      where: { key: parsed.data.key },
      data: { enabled: parsed.data.enabled },
    });

    await prisma.taskInteraction.create({
      data: {
        userId,
        type: "rule_toggled",
        metadata: { key: updated.key, enabled: updated.enabled } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ rule: updated });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

