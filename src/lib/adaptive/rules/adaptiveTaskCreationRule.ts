import { prisma } from "@/lib/db/prisma";
import { whereAdaptiveSuggestionStudySession } from "@/lib/adaptive/suggestion-session-scope";
import type { TaskFormChipKey } from "@/lib/settings/task-form-chips";
import { buildWhyExplanation } from "@/lib/adaptive/suggestion-explanation";
import type { AdaptiveRule } from "../types";
import { thresholdMultiplier } from "../engineConfig";

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

function chipKeysFromTask(t: {
  listName: string | null;
  tags: string[];
  estimatedMinutes: number | null;
  reminderAt: Date | null;
  description: string | null;
}): TaskFormChipKey[] {
  const keys: TaskFormChipKey[] = [];
  if (t.listName?.trim()) keys.push("list");
  if ((t.tags?.length ?? 0) > 0) keys.push("tags");
  if (t.estimatedMinutes != null) keys.push("duration");
  if (t.reminderAt != null) keys.push("reminder");
  if (t.description?.trim()) keys.push("description");
  return keys;
}

export const adaptiveTaskCreationRule: AdaptiveRule = {
  key: "adaptive_task_creation",
  name: "Adaptives Aufgabenformular",
  description:
    "Erkennt, welche Zusatzfelder du oft nutzt, und schlägt sie als Chips beim Anlegen vor (nach mehreren Aufgaben).",
  async evaluate(ctx) {
    if (ctx.screen !== "task_created") return null;

    const existing = await prisma.adaptiveSuggestion.findFirst({
      where: {
        userId: ctx.userId,
        ruleKey: "adaptive_task_creation",
        status: "pending",
        ...whereAdaptiveSuggestionStudySession(ctx.studySessionId),
      },
      select: { id: true },
    });
    if (existing) return null;

    const isGuest = Boolean(ctx.isGuestStudyUser);
    const mult = ctx.config ? thresholdMultiplier(ctx.config) : 1;

    const selectOptional = {
      listName: true,
      tags: true,
      estimatedMinutes: true,
      reminderAt: true,
      description: true,
    } as const;

    if (isGuest) {
      const recentGuest = await prisma.task.findMany({
        where: { userId: ctx.userId },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: selectOptional,
      });
      const richTask = recentGuest.find(usesRichOptional);
      if (!richTask) return null;
      const chipKeys = chipKeysFromTask(richTask);
      if (chipKeys.length === 0) return null;
      return {
        ruleKey: "adaptive_task_creation",
        type: "task_form_chips",
        title: "Felder schneller hinzufügen?",
        explanation: buildWhyExplanation("adaptive_task_creation", { isGuest: true }),
        payload: { chipKeys, signal: { guest: true, sampleSize: recentGuest.length } },
      };
    }

    const baseSample = 6;
    const minN = Math.max(5, Math.ceil(baseSample * mult));
    const recent = await prisma.task.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { ...selectOptional, dueDate: true },
    });
    if (recent.length < minN) return null;

    const n = recent.length;
    const rate = (pred: (t: (typeof recent)[number]) => boolean) => recent.filter(pred).length / n;

    const chipKeys: TaskFormChipKey[] = [];
    const tList = Math.min(0.92, 0.34 * mult);
    const tTags = Math.min(0.92, 0.28 * mult);
    const tDur = Math.min(0.92, 0.3 * mult);
    const tRem = Math.min(0.92, 0.32 * mult);
    const tDesc = Math.min(0.92, 0.26 * mult);

    if (rate((t) => Boolean(t.listName?.trim())) >= tList) chipKeys.push("list");
    if (rate((t) => (t.tags?.length ?? 0) > 0) >= tTags) chipKeys.push("tags");
    if (rate((t) => t.estimatedMinutes != null) >= tDur) chipKeys.push("duration");
    if (rate((t) => t.reminderAt != null) >= tRem) chipKeys.push("reminder");
    if (rate((t) => Boolean(t.description?.trim())) >= tDesc) chipKeys.push("description");

    if (chipKeys.length === 0) return null;

    return {
      ruleKey: "adaptive_task_creation",
      type: "task_form_chips",
      title: "Felder schneller hinzufügen?",
      explanation: buildWhyExplanation("adaptive_task_creation"),
      payload: {
        chipKeys,
        signal: {
          sampleSize: n,
          rates: {
            list: rate((t) => Boolean(t.listName?.trim())),
            tags: rate((t) => (t.tags?.length ?? 0) > 0),
            duration: rate((t) => t.estimatedMinutes != null),
            reminder: rate((t) => t.reminderAt != null),
            description: rate((t) => Boolean(t.description?.trim())),
          },
        },
      },
    };
  },
};
