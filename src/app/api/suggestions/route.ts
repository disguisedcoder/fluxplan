import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { z } from "zod";
import { isHttpError } from "@/lib/http/errors";

const StatusSchema = z.enum(["pending", "accepted", "rejected", "snoozed", "undone"]);

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status");

    const parsedStatus = StatusSchema.safeParse(statusParam);
    const status: z.infer<typeof StatusSchema> | undefined = parsedStatus.success
      ? parsedStatus.data
      : undefined;

    const suggestions = await prisma.adaptiveSuggestion.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ suggestions });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

