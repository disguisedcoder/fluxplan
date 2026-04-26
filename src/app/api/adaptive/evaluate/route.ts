import { NextResponse } from "next/server";

import { requireUserId } from "@/lib/auth/require-user";
import { runAdaptiveEngine } from "@/lib/adaptive/adaptiveEngine";
import { z } from "zod";
import { isHttpError } from "@/lib/http/errors";

const EvaluateSchema = z.object({
  screen: z.string().min(1),
  taskId: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = EvaluateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    const result = await runAdaptiveEngine({
      userId,
      screen: parsed.data.screen,
      taskId: parsed.data.taskId,
      metadata: parsed.data.metadata,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

