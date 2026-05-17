import { prisma } from "@/lib/db/prisma";
import { whereAdaptiveSuggestionStudySession } from "@/lib/adaptive/suggestion-session-scope";
import { buildWhyExplanation } from "@/lib/adaptive/suggestion-explanation";
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

export const adaptiveOptionalFoldRule: AdaptiveRule = {
  key: "adaptive_optional_fold",
  name: "Formular: Zusatzfelder einklappen",
  description:
    "Wenn Kategorie, Tags, Dauer, Erinnerung und Beschreibung in letzter Zeit selten vorkommen, können sie zunächst verborgen werden – jederzeit ausklappbar.",
  async evaluate(ctx) {
    if (ctx.screen !== "task_created") return null;

    const foldPref = await prisma.userPreference.findUnique({
      where: { userId_key: { userId: ctx.userId, key: "taskFormOptionalFold" } },
      select: { value: true },
    });
    if (readTaskFormOptionalFold(foldPref?.value)) return null;

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

    const existingFold = await prisma.adaptiveSuggestion.findFirst({
      where: {
        userId: ctx.userId,
        ruleKey: "adaptive_optional_fold",
        type: "task_form_optional_fold",
        status: "pending",
        ...whereAdaptiveSuggestionStudySession(ctx.studySessionId),
      },
      select: { id: true },
    });
    if (existingFold) return null;

    if (ctx.isGuestStudyUser) {
      const last = await prisma.task.findFirst({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "desc" },
        select: {
          listName: true,
          tags: true,
          estimatedMinutes: true,
          reminderAt: true,
          description: true,
        },
      });
      if (!last || usesRichOptional(last)) return null;
      return {
        ruleKey: "adaptive_optional_fold",
        type: "task_form_optional_fold",
        title: "Zusatzfelder zunächst ausblenden?",
        explanation: buildWhyExplanation("adaptive_optional_fold", { isGuest: true }),
        payload: { optionalUsageRate: 0, sampleSize: 1, guest: true },
      };
    }

    const recent = await prisma.task.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        listName: true,
        tags: true,
        estimatedMinutes: true,
        reminderAt: true,
        description: true,
      },
    });

    const baseSample = 6;
    const mult = ctx.config ? thresholdMultiplier(ctx.config) : 1;
    if (recent.length < Math.max(4, Math.ceil(baseSample * mult))) return null;

    const rate = recent.filter(usesRichOptional).length / recent.length;
    const maxRate = Math.min(0.4, 0.28 / mult);

    if (rate > maxRate) return null;

    return {
      ruleKey: "adaptive_optional_fold",
      type: "task_form_optional_fold",
      title: "Zusatzfelder zunächst ausblenden?",
      explanation: buildWhyExplanation("adaptive_optional_fold"),
      payload: { optionalUsageRate: rate, sampleSize: recent.length },
    };
  },
};
