import { prisma } from "@/lib/db/prisma";
import type { AdaptiveContext, AdaptiveRule, SuggestionDraft } from "./types";
import { Prisma } from "@prisma/client";

import { viewPreferenceRule } from "./rules/viewPreferenceRule";
import { reminderPreferenceRule } from "./rules/reminderPreferenceRule";
import { dailyFocusRule } from "./rules/dailyFocusRule";
import { calendarConflictRule } from "./rules/calendarConflictRule";
import { adaptiveTaskCreationRule } from "./rules/adaptiveTaskCreationRule";
import { isRulePaused, loadEngineConfig } from "./engineConfig";

const rules: AdaptiveRule[] = [
  viewPreferenceRule,
  reminderPreferenceRule,
  dailyFocusRule,
  calendarConflictRule,
  adaptiveTaskCreationRule,
];

export async function runAdaptiveEngine(ctx: AdaptiveContext) {
  const config = ctx.config ?? (await loadEngineConfig(ctx.userId));
  if (!config.adaptiveEnabled) {
    await logEvaluation(ctx, { reason: "adaptive_disabled", createdCount: 0 });
    return { createdCount: 0 };
  }

  const enabled = await prisma.adaptiveRule.findMany({
    where: { enabled: true },
    select: { key: true },
  });
  const enabledKeys = new Set(enabled.map((r) => r.key));

  const created: SuggestionDraft[] = [];
  const ctxWithConfig: AdaptiveContext = { ...ctx, config };

  for (const rule of rules) {
    if (!enabledKeys.has(rule.key)) continue;
    if (isRulePaused(config, rule.key)) continue;

    const draft = await rule.evaluate(ctxWithConfig);
    if (!draft) continue;

    const dup = await prisma.adaptiveSuggestion.findFirst({
      where: { userId: ctx.userId, ruleKey: draft.ruleKey, type: draft.type, status: "pending" },
      select: { id: true },
    });
    if (dup) continue;

    await prisma.adaptiveSuggestion.create({
      data: {
        userId: ctx.userId,
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
        type: "engine_evaluated",
        metadata: { screen: ctx.screen, ...metadata } as Prisma.InputJsonValue,
      },
    });
  } catch {
    // logging is best-effort
  }
}
