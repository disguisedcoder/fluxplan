import { prisma } from "@/lib/db/prisma";

import { whereAdaptiveSuggestionStudySession } from "@/lib/adaptive/suggestion-session-scope";

/** Lokaler Kalendertag (Server-Zeitzone), konsistent mit dailyFocusRule. */
export function startOfLocalDay(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Kein neuer Pending-Vorschlag derselben Regel am selben Tag, wenn der Nutzer
 * heute bereits angenommen oder abgelehnt hat (Studie/UX: kein „zweites Annehmen“).
 * Snooze zählt nicht: Engine-Cooldown regelt „später nochmal fragen“.
 */
export async function hasAcceptedOrRejectedSuggestionToday(
  userId: string,
  ruleKey: string,
  studySessionId: string | null | undefined,
  now = new Date(),
): Promise<boolean> {
  const since = startOfLocalDay(now);
  const row = await prisma.adaptiveSuggestion.findFirst({
    where: {
      userId,
      ruleKey,
      status: { in: ["accepted", "rejected"] },
      respondedAt: { not: null, gte: since },
      ...whereAdaptiveSuggestionStudySession(studySessionId),
    },
    select: { id: true },
  });
  return Boolean(row);
}
