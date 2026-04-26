import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserId } from "@/lib/auth/require-user";
import { isHttpError } from "@/lib/http/errors";
import { parseTask } from "@/lib/parser/task-parser";

const ParseSchema = z.object({
  input: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  try {
    await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = ParseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const result = parseTask(parsed.data.input);
    return NextResponse.json({ parsed: result });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
