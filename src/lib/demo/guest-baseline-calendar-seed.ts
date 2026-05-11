import type { Prisma } from "@prisma/client";

import { seedGuestWorkshopSharedContent } from "./guest-adaptive-showcase-seed";

/**
 * Gast **Baseline**: gleicher **Demo-Kalender** wie beim adaptiven Workshop (Aufgaben + Timeline + Navigation),
 * **ohne** adaptive Vorschläge (`adaptive.enabled` bleibt aus — siehe Session-Start / Reset).
 */
export async function seedGuestBaselineCalendar(
  tx: Prisma.TransactionClient,
  opts: { userId: string; studySessionId: string },
): Promise<void> {
  await seedGuestWorkshopSharedContent(tx, opts);
}
