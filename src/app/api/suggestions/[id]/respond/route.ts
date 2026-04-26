import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { isHttpError } from "@/lib/http/errors";
import { maybeApplyCooldownAfterReject } from "@/lib/adaptive/engineConfig";

const RespondSchema = z.object({
  action: z.enum(["accept", "reject", "snooze", "undo"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const parsed = RespondSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const suggestion = await prisma.adaptiveSuggestion.findFirst({
      where: { id, userId },
    });
    if (!suggestion) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (parsed.data.action === "accept") {
      await applySuggestion(userId, suggestion);
      const updated = await prisma.adaptiveSuggestion.update({
        where: { id },
        data: { status: "accepted", respondedAt: new Date() },
      });
      await prisma.taskInteraction.create({
        data: { userId, type: "suggestion_accepted", metadata: { suggestionId: id, ruleKey: updated.ruleKey } },
      });
      return NextResponse.json({ suggestion: updated });
    }

    if (parsed.data.action === "reject") {
      const updated = await prisma.adaptiveSuggestion.update({
        where: { id },
        data: { status: "rejected", respondedAt: new Date() },
      });
      await prisma.taskInteraction.create({
        data: { userId, type: "suggestion_rejected", metadata: { suggestionId: id, ruleKey: updated.ruleKey } },
      });
      const cooldown = await maybeApplyCooldownAfterReject(userId, updated.ruleKey);
      if (cooldown) {
        await prisma.taskInteraction.create({
          data: {
            userId,
            type: "rule_cooldown_started",
            metadata: { ruleKey: updated.ruleKey, until: cooldown.until.toISOString() },
          },
        });
      }
      return NextResponse.json({ suggestion: updated, cooldown });
    }

    if (parsed.data.action === "snooze") {
      const updated = await prisma.adaptiveSuggestion.update({
        where: { id },
        data: { status: "snoozed", respondedAt: new Date() },
      });
      await prisma.taskInteraction.create({
        data: { userId, type: "suggestion_snoozed", metadata: { suggestionId: id, ruleKey: updated.ruleKey } },
      });
      return NextResponse.json({ suggestion: updated });
    }

    // undo
    if (suggestion.status !== "accepted") {
      const updated = await prisma.adaptiveSuggestion.update({
        where: { id },
        data: { status: "undone", respondedAt: new Date() },
      });
      await prisma.taskInteraction.create({
        data: { userId, type: "suggestion_undone", metadata: { suggestionId: id, ruleKey: updated.ruleKey } },
      });
      return NextResponse.json({ suggestion: updated });
    }

    await undoSuggestion(userId, suggestion);
    const updated = await prisma.adaptiveSuggestion.update({
      where: { id },
      data: { status: "undone", respondedAt: new Date() },
    });
    await prisma.taskInteraction.create({
      data: { userId, type: "suggestion_undone", metadata: { suggestionId: id, ruleKey: updated.ruleKey } },
    });
    return NextResponse.json({ suggestion: updated });
  } catch (e: unknown) {
    if (isHttpError(e) && e.status === 401)
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function applySuggestion(
  userId: string,
  s: { type: string; payload: unknown },
) {
  const payload =
    typeof s.payload === "object" && s.payload !== null
      ? (s.payload as Record<string, unknown>)
      : {};

  if (s.type === "start_view") {
    const href = String(payload.suggestedStartView ?? "/heute");
    await prisma.userPreference.upsert({
      where: { userId_key: { userId, key: "startView" } },
      update: { value: { href } },
      create: { userId, key: "startView", value: { href } },
    });
    return;
  }

  if (s.type === "reminder_suggestion") {
    const taskId = String(payload.taskId ?? "");
    const proposed = payload.proposedReminderAt
      ? new Date(String(payload.proposedReminderAt))
      : null;
    if (taskId && proposed) {
      await prisma.task.update({ where: { id: taskId }, data: { reminderAt: proposed } });
    }
    return;
  }
}

async function undoSuggestion(userId: string, s: { type: string; payload: unknown }) {
  const payload =
    typeof s.payload === "object" && s.payload !== null
      ? (s.payload as Record<string, unknown>)
      : {};

  if (s.type === "start_view") {
    await prisma.userPreference.deleteMany({ where: { userId, key: "startView" } });
    return;
  }

  if (s.type === "reminder_suggestion") {
    const taskId = String(payload.taskId ?? "");
    if (taskId) {
      await prisma.task.update({ where: { id: taskId }, data: { reminderAt: null } });
    }
    return;
  }
}

