import type { Prisma } from "@prisma/client";

/** Vorschläge sind pro StudySession; `null` = ältere Zeilen ohne Session-Verknüpfung. */
export function whereAdaptiveSuggestionStudySession(
  studySessionId: string | null | undefined,
): Prisma.AdaptiveSuggestionWhereInput {
  return { studySessionId: studySessionId ?? null };
}
