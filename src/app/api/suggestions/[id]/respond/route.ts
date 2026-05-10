import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireUserId } from "@/lib/auth/require-user";
import { getStudyCookies } from "@/lib/auth/study-session";
import { isHttpError } from "@/lib/http/errors";
import { resolveInteractionStudySessionId } from "@/lib/data/interaction-study-session";
import { maybeApplyCooldownAfterReject } from "@/lib/adaptive/engineConfig";
import { normalizeStartViewHref } from "@/lib/settings/start-view";
import { isTaskFormChipKey, type TaskFormChipKey } from "@/lib/settings/task-form-chips";
import {
  addLocalCalendarDays,
  readReminderSnoozeDaysPref,
  REMINDER_SNOOZE_DAYS_PREF_KEY,
  REMINDER_SNOOZE_UNTIL_PREF_KEY,
} from "@/lib/settings/reminder-snooze";
import { DAILY_FOCUS_LIST_HIGHLIGHT_PREF_KEY } from "@/lib/settings/daily-focus-list-highlight";

const RespondSchema = z.object({
  action: z.enum(["accept", "reject", "snooze", "undo"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { sessionId } = await getStudyCookies();
    const { id } = await ctx.params;

    const body = await req.json().catch(() => null);
    const parsed = RespondSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

    const suggestion = await prisma.adaptiveSuggestion.findFirst({
      where: { id, userId },
    });
    if (!suggestion) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const interactionSessionId = await resolveInteractionStudySessionId(
      userId,
      sessionId,
      suggestion.studySessionId,
    );

    if (parsed.data.action === "accept") {
      await applySuggestion(userId, suggestion);
      const updated = await prisma.adaptiveSuggestion.update({
        where: { id },
        data: { status: "accepted", respondedAt: new Date() },
      });
      await prisma.taskInteraction.create({
        data: {
          userId,
          studySessionId: interactionSessionId,
          type: "suggestion_accepted",
          metadata: { suggestionId: id, ruleKey: updated.ruleKey },
        },
      });
      return NextResponse.json({ suggestion: updated });
    }

    if (parsed.data.action === "reject") {
      const updated = await prisma.adaptiveSuggestion.update({
        where: { id },
        data: { status: "rejected", respondedAt: new Date() },
      });
      if (updated.ruleKey === "reminder_preference") {
        await prisma.userPreference.deleteMany({
          where: { userId, key: REMINDER_SNOOZE_UNTIL_PREF_KEY },
        });
      }
      await prisma.taskInteraction.create({
        data: {
          userId,
          studySessionId: interactionSessionId,
          type: "suggestion_rejected",
          metadata: { suggestionId: id, ruleKey: updated.ruleKey },
        },
      });
      const cooldown = await maybeApplyCooldownAfterReject(userId, updated.ruleKey);
      if (cooldown) {
        await prisma.taskInteraction.create({
          data: {
            userId,
            studySessionId: interactionSessionId,
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
      let reminderSnooze: { until: string; days: number } | undefined;
      if (updated.ruleKey === "reminder_preference") {
        const daysRow = await prisma.userPreference.findUnique({
          where: { userId_key: { userId, key: REMINDER_SNOOZE_DAYS_PREF_KEY } },
          select: { value: true },
        });
        const days = readReminderSnoozeDaysPref(daysRow?.value);
        const until = addLocalCalendarDays(new Date(), days);
        await prisma.userPreference.upsert({
          where: { userId_key: { userId, key: REMINDER_SNOOZE_UNTIL_PREF_KEY } },
          update: { value: { until: until.toISOString() } as Prisma.InputJsonValue },
          create: {
            userId,
            key: REMINDER_SNOOZE_UNTIL_PREF_KEY,
            value: { until: until.toISOString() } as Prisma.InputJsonValue,
          },
        });
        reminderSnooze = { until: until.toISOString(), days };
      }
      await prisma.taskInteraction.create({
        data: {
          userId,
          studySessionId: interactionSessionId,
          type: "suggestion_snoozed",
          metadata: { suggestionId: id, ruleKey: updated.ruleKey },
        },
      });
      return NextResponse.json({ suggestion: updated, reminderSnooze });
    }

    // undo — Vorschlag wieder „offen“ (pending), erscheint unter Aktive Vorschläge
    if (suggestion.status === "pending") {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    if (suggestion.status !== "accepted") {
      if (
        suggestion.ruleKey === "reminder_preference" &&
        suggestion.status === "snoozed"
      ) {
        await prisma.userPreference.deleteMany({
          where: { userId, key: REMINDER_SNOOZE_UNTIL_PREF_KEY },
        });
      }
      const updated = await prisma.adaptiveSuggestion.update({
        where: { id },
        data: { status: "pending", respondedAt: null },
      });
      await prisma.taskInteraction.create({
        data: {
          userId,
          studySessionId: interactionSessionId,
          type: "suggestion_undone",
          metadata: {
            suggestionId: id,
            ruleKey: updated.ruleKey,
            reopenedAsPending: true,
          } as Prisma.InputJsonValue,
        },
      });
      return NextResponse.json({ suggestion: updated });
    }

    await undoSuggestion(userId, suggestion);
    const updated = await prisma.adaptiveSuggestion.update({
      where: { id },
      data: { status: "pending", respondedAt: null },
    });
    await prisma.taskInteraction.create({
      data: {
        userId,
        studySessionId: interactionSessionId,
        type: "suggestion_undone",
        metadata: {
          suggestionId: id,
          ruleKey: updated.ruleKey,
          reopenedAsPending: true,
        } as Prisma.InputJsonValue,
      },
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
    const href = normalizeStartViewHref(String(payload.suggestedStartView ?? "/heute"));
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
    await prisma.userPreference.deleteMany({
      where: { userId, key: REMINDER_SNOOZE_UNTIL_PREF_KEY },
    });
    return;
  }

  if (s.type === "task_form_chips") {
    const raw = payload.chipKeys ?? payload.suggestedChips;
    const chipKeys: TaskFormChipKey[] = [];
    if (Array.isArray(raw)) {
      for (const x of raw) {
        if (isTaskFormChipKey(x)) chipKeys.push(x);
        else if (x === "reminderAt") chipKeys.push("reminder");
        else if (x === "dueDate") continue;
      }
    }
    if (chipKeys.length === 0) return;
    const value = { enabled: true, chipKeys } as Prisma.InputJsonValue;
    await prisma.userPreference.upsert({
      where: { userId_key: { userId, key: "adaptive.taskFormChips" } },
      update: { value },
      create: { userId, key: "adaptive.taskFormChips", value },
    });
    return;
  }

  if (s.type === "task_form_optional_unfold") {
    await prisma.userPreference.deleteMany({ where: { userId, key: "taskFormOptionalFold" } });
    return;
  }

  if (s.type === "task_form_optional_fold") {
    await prisma.userPreference.upsert({
      where: { userId_key: { userId, key: "taskFormOptionalFold" } },
      update: { value: { enabled: true } },
      create: { userId, key: "taskFormOptionalFold", value: { enabled: true } },
    });
    return;
  }

  if (s.type === "daily_focus") {
    const value = { enabled: true } as Prisma.InputJsonValue;
    await prisma.userPreference.upsert({
      where: { userId_key: { userId, key: DAILY_FOCUS_LIST_HIGHLIGHT_PREF_KEY } },
      update: { value },
      create: { userId, key: DAILY_FOCUS_LIST_HIGHLIGHT_PREF_KEY, value },
    });
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
    await prisma.userPreference.deleteMany({
      where: { userId, key: REMINDER_SNOOZE_UNTIL_PREF_KEY },
    });
    return;
  }

  if (s.type === "task_form_optional_fold") {
    await prisma.userPreference.deleteMany({ where: { userId, key: "taskFormOptionalFold" } });
    return;
  }

  if (s.type === "task_form_chips") {
    await prisma.userPreference.deleteMany({ where: { userId, key: "adaptive.taskFormChips" } });
    return;
  }

  if (s.type === "task_form_optional_unfold") {
    await prisma.userPreference.upsert({
      where: { userId_key: { userId, key: "taskFormOptionalFold" } },
      update: { value: { enabled: true } },
      create: { userId, key: "taskFormOptionalFold", value: { enabled: true } },
    });
    return;
  }

  if (s.type === "daily_focus") {
    await prisma.userPreference.deleteMany({
      where: { userId, key: DAILY_FOCUS_LIST_HIGHLIGHT_PREF_KEY },
    });
    return;
  }
}

