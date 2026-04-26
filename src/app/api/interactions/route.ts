import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { runAdaptiveEngine } from "@/lib/adaptive/adaptiveEngine";
import { Prisma } from "@prisma/client";
import { isHttpError } from "@/lib/http/errors";

const InteractionSchema = z.object({
  type: z.string().min(1).max(64),
  taskId: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  screen: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = InteractionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const record = await prisma.taskInteraction.create({
      data: {
        userId,
        taskId: parsed.data.taskId ?? null,
        type: parsed.data.type,
        metadata: (parsed.data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    // For view-related events, run the engine opportunistically.
    if (parsed.data.type === "view_changed" && parsed.data.screen) {
      await runAdaptiveEngine({ userId, screen: parsed.data.screen, metadata: parsed.data.metadata });
    }

    return NextResponse.json({ interaction: record }, { status: 201 });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

