import { prisma } from "@/lib/db/prisma";
import { getSavedStartViewHref, normalizeStartViewHref } from "@/lib/settings/start-view";

/**
 * Ziel-URL für `/start` (ohne `redirect()` in einer Server-Page): wird vom Route-Handler
 * `GET /start` genutzt, damit kein RSC-`performance.measure`-Fehler bei sofortigem Redirect
 * (Next 16 / Turbopack, s. vercel/next.js#86060).
 *
 * Ohne Session → `/willkommen`. Ohne gespeicherte `startView` ebenfalls `/willkommen`.
 */
export async function getStartRedirectHref(userId: string | null): Promise<string> {
  if (!userId) return "/willkommen";

  const rows = await prisma.userPreference.findMany({
    where: { userId },
    select: { key: true, value: true },
  });
  const prefs: Record<string, unknown> = {};
  for (const r of rows) prefs[r.key] = r.value;

  const saved = getSavedStartViewHref(prefs);
  if (!saved) return "/willkommen";
  return normalizeStartViewHref(saved);
}
