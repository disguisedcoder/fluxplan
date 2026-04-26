import { prisma } from "@/lib/db/prisma";
import type { AdaptiveRule } from "../types";
import { thresholdMultiplier } from "../engineConfig";

export const viewPreferenceRule: AdaptiveRule = {
  key: "view_preference",
  name: "Ansichtspräferenz",
  description: "Schlägt vor, eine häufig genutzte Ansicht als Startansicht zu setzen.",
  async evaluate(ctx) {
    if (!ctx.screen) return null;

    const existing = await prisma.adaptiveSuggestion.findFirst({
      where: { userId: ctx.userId, ruleKey: "view_preference", status: "pending" },
      select: { id: true },
    });
    if (existing) return null;

    const recent = await prisma.taskInteraction.findMany({
      where: { userId: ctx.userId, type: "view_changed" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { metadata: true },
    });

    const planningCount = recent.filter((r) => {
      const m = r.metadata as unknown;
      if (typeof m !== "object" || m === null) return false;
      const to = (m as Record<string, unknown>).to;
      return to === "/kalender" || to === "/planning";
    }).length;

    const baseThreshold = 4;
    const mult = ctx.config ? thresholdMultiplier(ctx.config) : 1;
    const threshold = Math.max(2, Math.ceil(baseThreshold * mult));
    if (planningCount < threshold) return null;

    return {
      ruleKey: "view_preference",
      type: "start_view",
      title: "Kalenderansicht bevorzugen?",
      explanation:
        "Dieser Vorschlag erscheint, weil du in letzter Zeit häufig zur Kalenderansicht gewechselt hast.",
      payload: { suggestedStartView: "/kalender", signal: { planningCount, sampleSize: recent.length } },
    };
  },
};

