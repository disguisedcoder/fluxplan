import { prisma } from "@/lib/db/prisma";
import type { AdaptiveRule } from "../types";
import { thresholdMultiplier } from "../engineConfig";

export const adaptiveTaskCreationRule: AdaptiveRule = {
  key: "adaptive_task_creation",
  name: "Adaptives Aufgabenformular",
  description:
    "Hält das Formular zuerst einfach und schlägt Zusatzfelder als Chips vor.",
  async evaluate(ctx) {
    if (ctx.screen !== "task_created") return null;

    const existing = await prisma.adaptiveSuggestion.findFirst({
      where: { userId: ctx.userId, ruleKey: "adaptive_task_creation", status: "pending" },
      select: { id: true },
    });
    if (existing) return null;

    const recent = await prisma.task.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { dueDate: true, reminderAt: true, priority: true },
    });

    const baseSample = 6;
    const mult = ctx.config ? thresholdMultiplier(ctx.config) : 1;
    if (recent.length < Math.max(4, Math.ceil(baseSample * mult))) return null;

    const dueUsage = recent.filter((t) => t.dueDate != null).length / recent.length;
    const reminderUsage = recent.filter((t) => t.reminderAt != null).length / recent.length;

    const dueThreshold = Math.min(0.95, 0.7 * mult);
    const reminderThreshold = Math.min(0.85, 0.4 * mult);

    const chips: string[] = [];
    if (dueUsage >= dueThreshold) chips.push("dueDate");
    if (reminderUsage >= reminderThreshold) chips.push("reminderAt");

    if (chips.length === 0) return null;

    return {
      ruleKey: "adaptive_task_creation",
      type: "task_form_chips",
      title: "Felder schneller hinzufügen?",
      explanation:
        "Dieser Vorschlag erscheint, weil du in letzter Zeit häufig zusätzliche Felder nutzt. FluxPlan kann sie als kurze Vorschlags-Chips anzeigen – du behältst die Kontrolle.",
      payload: { suggestedChips: chips, signal: { dueUsage, reminderUsage, sampleSize: recent.length } },
    };
  },
};

