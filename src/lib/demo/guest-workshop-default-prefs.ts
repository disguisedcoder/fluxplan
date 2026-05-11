import type { Prisma } from "@prisma/client";

import { clampInterventionLevel } from "@/lib/settings/intervention-levels";

function prefPrimitive(v: boolean | number): Prisma.InputJsonValue {
  return { value: v } as Prisma.InputJsonValue;
}

/**
 * Gast: **Werk-Defaults** für adaptive Schalter & Eingriffsstufe (optional abweichende Stufe, Standard **2**).
 */
export async function applyGuestWorkshopDefaultPreferences(
  tx: Prisma.TransactionClient,
  opts: { userId: string; variant: "baseline" | "adaptive"; interventionLevel?: number },
): Promise<void> {
  const { userId, variant } = opts;
  const adaptiveOn = variant === "adaptive";
  const level = clampInterventionLevel(opts.interventionLevel ?? 2);
  await tx.userPreference.upsert({
    where: { userId_key: { userId, key: "adaptive.enabled" } },
    update: { value: prefPrimitive(adaptiveOn) },
    create: { userId, key: "adaptive.enabled", value: prefPrimitive(adaptiveOn) },
  });
  await tx.userPreference.upsert({
    where: { userId_key: { userId, key: "adaptive.interventionLevel" } },
    update: { value: prefPrimitive(level) },
    create: { userId, key: "adaptive.interventionLevel", value: prefPrimitive(level) },
  });
}
