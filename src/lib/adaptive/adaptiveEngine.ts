import { prisma } from "@/lib/db/prisma";
import type { AdaptiveContext, AdaptiveRule, SuggestionDraft } from "./types";
import { Prisma } from "@prisma/client";

import { viewPreferenceRule } from "./rules/viewPreferenceRule";
import { reminderPreferenceRule } from "./rules/reminderPreferenceRule";
import { dailyFocusRule } from "./rules/dailyFocusRule";
import { calendarConflictRule } from "./rules/calendarConflictRule";
import { adaptiveTaskCreationRule } from "./rules/adaptiveTaskCreationRule";
import { adaptiveOptionalFoldRule } from "./rules/adaptiveOptionalFoldRule";
import { adaptiveOptionalUnfoldRule } from "./rules/adaptiveOptionalUnfoldRule";
import { isRulePaused, loadEngineConfig } from "./engineConfig";
import { hasAcceptedOrRejectedSuggestionToday } from "./suggestionDayThrottle";
import { whereAdaptiveSuggestionStudySession } from "@/lib/adaptive/suggestion-session-scope";
import { isGuestStudyPseudonym } from "@/lib/demo/guest-study";

/** Nach Annehmen/Ablehnen am selben Kalendertag kein neuer Pending-Vorschlag (Snooze ausgenommen). */
const THROTTLE_BY_DAY_RULE_KEYS = new Set([
  "view_preference",
  "reminder_preference",
  "daily_focus",
  "calendar_conflict",
  "adaptive_task_creation",
  "adaptive_optional_fold",
  "adaptive_optional_unfold",
]);

const rules: AdaptiveRule[] = [
  viewPreferenceRule,
  reminderPreferenceRule,
  dailyFocusRule,
  calendarConflictRule,
  adaptiveTaskCreationRule,
  adaptiveOptionalFoldRule,
  adaptiveOptionalUnfoldRule,
];

export async function runAdaptiveEngine(ctx: AdaptiveContext) {
  const config = ctx.config ?? (await loadEngineConfig(ctx.userId, ctx.studySessionId));
  if (!config.adaptiveEnabled) {
    await logEvaluation(ctx, { reason: "adaptive_disabled", createdCount: 0 });
    return { createdCount: 0 };
  }

  const userRow = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { pseudonym: true },
  });
  const isGuestStudyUser = isGuestStudyPseudonym(userRow?.pseudonym);

  const enabled = await prisma.adaptiveRule.findMany({
    where: { enabled: true },
    select: { key: true },
  });
  const enabledKeys = new Set(enabled.map((r) => r.key));

  const created: SuggestionDraft[] = [];
  const ctxWithConfig: AdaptiveContext = { ...ctx, config, isGuestStudyUser };

  for (const rule of rules) {
    if (!enabledKeys.has(rule.key)) continue;
    if (isRulePaused(config, rule.key)) continue;

    const draft = await rule.evaluate(ctxWithConfig);
    if (!draft) continue;

    const dup = await prisma.adaptiveSuggestion.findFirst({
      where: {
        userId: ctx.userId,
        ruleKey: draft.ruleKey,
        type: draft.type,
        status: "pending",
        ...whereAdaptiveSuggestionStudySession(ctx.studySessionId),
      },
      select: { id: true },
    });
    if (dup) continue;

    if (
      THROTTLE_BY_DAY_RULE_KEYS.has(draft.ruleKey) &&
      (await hasAcceptedOrRejectedSuggestionToday(ctx.userId, draft.ruleKey, ctx.studySessionId))
    ) {
      continue;
    }

    await prisma.adaptiveSuggestion.create({
      data: {
        userId: ctx.userId,
        studySessionId: ctx.studySessionId ?? null,
        ruleKey: draft.ruleKey,
        type: draft.type,
        title: draft.title,
        explanation: draft.explanation,
        payload: draft.payload as Prisma.InputJsonValue,
        status: "pending",
      },
    });

    created.push(draft);
  }

  await logEvaluation(ctx, {
    createdCount: created.length,
    rules: created.map((c) => c.ruleKey),
  });

  return { createdCount: created.length, createdRuleKeys: created.map((c) => c.ruleKey) };
}

async function logEvaluation(
  ctx: AdaptiveContext,
  metadata: Record<string, unknown>,
) {
  try {
    await prisma.taskInteraction.create({
      data: {
        userId: ctx.userId,
        studySessionId: ctx.studySessionId ?? null,
        type: "engine_evaluated",
        metadata: { screen: ctx.screen, ...metadata } as Prisma.InputJsonValue,
      },
    });
  } catch {
    // logging is best-effort
  }
}
