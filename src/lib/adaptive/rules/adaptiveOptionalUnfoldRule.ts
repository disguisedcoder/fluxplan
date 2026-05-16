import { prisma } from "@/lib/db/prisma";
import { whereAdaptiveSuggestionStudySession } from "@/lib/adaptive/suggestion-session-scope";
import {
  formatGuestDemoExplanation,
  generalSuggestionExplanation,
} from "@/lib/adaptive/suggestion-explanation";
import type { AdaptiveRule } from "../types";
import { thresholdMultiplier } from "../engineConfig";
import { readTaskFormOptionalFold } from "@/lib/settings/task-form-optional-fold";

function usesRichOptional(t: {
  listName: string | null;
  tags: string[];
  estimatedMinutes: number | null;
  reminderAt: Date | null;
  description: string | null;
}) {
  return (
    Boolean(t.listName?.trim()) ||
    (t.tags?.length ?? 0) > 0 ||
    t.estimatedMinutes != null ||
    t.reminderAt != null ||
    Boolean(t.description?.trim())
  );
}

export const adaptiveOptionalUnfoldRule: AdaptiveRule = {
  key: "adaptive_optional_unfold",
  name: "Formular: Zusatzfelder wieder ausklappen",
  description:
    "Wenn Zusatzfelder eingeklappt sind, du sie in letzter Zeit aber wieder häufig nutzt, schlägt FluxPlan das Ausklappen vor.",
  async evaluate(ctx) {
    if (ctx.screen !== "task_created") return null;

    const foldPref = await prisma.userPreference.findUnique({
      where: { userId_key: { userId: ctx.userId, key: "taskFormOptionalFold" } },
      select: { value: true },
    });
    if (!readTaskFormOptionalFold(foldPref?.value)) return null;

    const chipsPending = await prisma.adaptiveSuggestion.findFirst({
      where: {
        userId: ctx.userId,
        ruleKey: "adaptive_task_creation",
        type: "task_form_chips",
        status: "pending",
        ...whereAdaptiveSuggestionStudySession(ctx.studySessionId),
      },
      select: { id: true },
    });
    if (chipsPending) return null;

    const existing = await prisma.adaptiveSuggestion.findFirst({
      where: {
        userId: ctx.userId,
        ruleKey: "adaptive_optional_unfold",
        type: "task_form_optional_unfold",
        status: "pending",
        ...whereAdaptiveSuggestionStudySession(ctx.studySessionId),
      },
      select: { id: true },
    });
    if (existing) return null;

    const selectOptional = {
      listName: true,
      tags: true,
      estimatedMinutes: true,
      reminderAt: true,
      description: true,
    } as const;

    if (ctx.isGuestStudyUser) {
      const last = await prisma.task.findFirst({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "desc" },
        select: selectOptional,
      });
      if (!last || !usesRichOptional(last)) return null;
      return {
        ruleKey: "adaptive_optional_unfold",
        type: "task_form_optional_unfold",
        title: "Zusatzfelder wieder einblenden?",
        explanation: formatGuestDemoExplanation(
          generalSuggestionExplanation.adaptive_optional_unfold,
          "Du nutzt Zusatzfelder im Workshop wieder aktiv.",
        ),
        payload: { hadFoldEnabled: true },
      };
    }

    const mult = ctx.config ? thresholdMultiplier(ctx.config) : 1;
    const recent = await prisma.task.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: selectOptional,
    });
    const baseSample = 5;
    if (recent.length < Math.max(4, Math.ceil(baseSample * mult))) return null;

    const rate = recent.filter(usesRichOptional).length / recent.length;
    const minRate = Math.max(0.48, 0.58 / mult);
    if (rate < minRate) return null;

    return {
      ruleKey: "adaptive_optional_unfold",
      type: "task_form_optional_unfold",
      title: "Zusatzfelder wieder einblenden?",
      explanation: generalSuggestionExplanation.adaptive_optional_unfold,
      payload: { hadFoldEnabled: true, optionalUsageRate: rate, sampleSize: recent.length },
    };
  },
};
