import { prisma } from "@/lib/db/prisma";

/**
 * Für `TaskInteraction.studySessionId`: nur eine Session-ID speichern, die wirklich zu `userId`
 * gehört — sonst bricht Prisma mit FK-Fehler ab (typisch bei veraltetem `fp_sessionId`-Cookie).
 */
export async function resolveInteractionStudySessionId(
  userId: string,
  cookieSessionId: string | null | undefined,
  suggestionStudySessionId: string | null | undefined,
): Promise<string | null> {
  if (suggestionStudySessionId) {
    const row = await prisma.studySession.findFirst({
      where: { id: suggestionStudySessionId, userId },
      select: { id: true },
    });
    if (row) return row.id;
  }
  if (cookieSessionId) {
    const row = await prisma.studySession.findFirst({
      where: { id: cookieSessionId, userId },
      select: { id: true },
    });
    if (row) return row.id;
  }
  return null;
}
