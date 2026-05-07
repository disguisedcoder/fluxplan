import { redirect } from "next/navigation";

import { getStudyCookies } from "@/lib/auth/study-session";
import { prisma } from "@/lib/db/prisma";
import { resolveStartViewFromPreferences } from "@/lib/settings/start-view";

export function readSeenWelcomePref(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "object" && value !== null && "value" in value) {
    const inner = (value as { value?: unknown }).value;
    if (typeof inner === "boolean") return inner;
  }
  return false;
}

/**
 * Route `/start`: Einstieg in die gewählte Startansicht (Heute, Kalender, …).
 * Ohne Session → `/willkommen`.
 *
 * Wichtig: `startView` muss auch dann greifen, wenn `seenWelcome` (noch) nicht gesetzt ist,
 * sonst wirkt „Startansicht übernehmen“ kaputt (Start führt wieder zur Willkommensseite).
 */
export async function redirectFromStartRoute(): Promise<never> {
  const { userId } = await getStudyCookies();
  if (!userId) {
    redirect("/willkommen");
  }

  const rows = await prisma.userPreference.findMany({
    where: { userId },
    select: { key: true, value: true },
  });
  const prefs: Record<string, unknown> = {};
  for (const r of rows) prefs[r.key] = r.value;

  redirect(resolveStartViewFromPreferences(prefs));
}
