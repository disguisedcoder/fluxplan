import type { Prisma } from "@prisma/client";

import {
  deleteAdaptiveOutcomePreferences,
  type DeleteAdaptiveOutcomeOptions,
} from "@/lib/data/adaptive-outcome-preferences";

export type SessionContentDeleteOptions = {
  /** G01/G02: `adaptive.interventionLevel` nach Session-Reset nicht löschen (Workshop-Showcase). */
  preserveGuestWorkshopInterventionLevel?: boolean;
};

/**
 * Filter für Listen/Export bei gesetzter Study-Session: nur aktuelle Session plus Altlasten ohne Session
 * (gleiche Semantik wie `deleteContentForStudySession`).
 */
export function whereTasksForActiveStudySession(
  userId: string,
  studySessionId: string | null,
): Prisma.TaskWhereInput {
  if (!studySessionId) return { userId };
  return { userId, OR: [{ studySessionId }, { studySessionId: null }] };
}

export function whereTaskInteractionsForActiveStudySession(
  userId: string,
  studySessionId: string | null,
): Prisma.TaskInteractionWhereInput {
  if (!studySessionId) return { userId };
  return { userId, OR: [{ studySessionId }, { studySessionId: null }] };
}

export function whereAdaptiveSuggestionsForActiveStudySession(
  userId: string,
  studySessionId: string | null,
): Prisma.AdaptiveSuggestionWhereInput {
  if (!studySessionId) return { userId };
  return { userId, OR: [{ studySessionId }, { studySessionId: null }] };
}

/** Löscht nur Inhalte, die zur angegebenen StudySession gehören (nicht andere Sessions desselben Users). */
export async function deleteContentForStudySession(
  tx: Prisma.TransactionClient,
  userId: string,
  studySessionId: string,
  opts?: SessionContentDeleteOptions,
) {
  const prefOpts: DeleteAdaptiveOutcomeOptions | undefined =
    opts?.preserveGuestWorkshopInterventionLevel ? { preserveInterventionLevel: true } : undefined;

  /** Zeilen ohne Session (Altlasten vor session-scoped Daten) mit aufräumen — sonst blockieren sie API-Filter (`GET` nur aktuelle Session). */
  const sessionOrLegacy: Prisma.TaskWhereInput = {
    userId,
    OR: [{ studySessionId }, { studySessionId: null }],
  };

  const tasks = await tx.task.deleteMany({ where: sessionOrLegacy });
  const interactions = await tx.taskInteraction.deleteMany({
    where: {
      userId,
      OR: [{ studySessionId }, { studySessionId: null }],
    },
  });
  const suggestions = await tx.adaptiveSuggestion.deleteMany({
    where: {
      userId,
      OR: [{ studySessionId }, { studySessionId: null }],
    },
  });
  const eventLogs = await tx.eventLog.deleteMany({
    where: { userId, sessionId: studySessionId },
  });
  const preferences = await deleteAdaptiveOutcomePreferences(tx, userId, prefOpts);
  return {
    tasks: tasks.count,
    interactions: interactions.count,
    suggestions: suggestions.count,
    preferences,
    eventLogs: eventLogs.count,
  };
}

/**
 * Alles App-Daten für den User (alle Sessions) — Fallback ohne aktive Session-Cookies.
 * `EventLog` bleibt wie bisher unangetastet (Export/Studienauswertung).
 */
export async function deleteAllContentForUser(tx: Prisma.TransactionClient, userId: string) {
  const tasks = await tx.task.deleteMany({ where: { userId } });
  const interactions = await tx.taskInteraction.deleteMany({ where: { userId } });
  const suggestions = await tx.adaptiveSuggestion.deleteMany({ where: { userId } });
  const preferences = await tx.userPreference.deleteMany({ where: { userId } });
  return {
    tasks: tasks.count,
    interactions: interactions.count,
    suggestions: suggestions.count,
    preferences: preferences.count,
    eventLogs: 0,
  };
}
