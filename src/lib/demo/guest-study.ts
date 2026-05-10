import type { Prisma } from "@prisma/client";

/** Genau zwei Gast-Codes für Workshops (nicht G1, G2, G3 …). */
export const GUEST_STUDY_PSEUDONYMS = ["G01", "G02"] as const;

export type GuestStudyPseudonym = (typeof GUEST_STUDY_PSEUDONYMS)[number];

export function isGuestStudyPseudonym(pseudonym: string | null | undefined): boolean {
  if (!pseudonym) return false;
  return /^(G01|G02)$/i.test(pseudonym.trim());
}

/**
 * Ersten freien Gast-Slot wählen (noch kein User mit diesem Pseudonym).
 * Wenn G01 und G02 existieren → `null` (HTTP 409).
 */
export async function allocateGuestPseudonym(
  tx: Prisma.TransactionClient,
): Promise<GuestStudyPseudonym | null> {
  for (const pseudonym of GUEST_STUDY_PSEUDONYMS) {
    const existing = await tx.user.findUnique({ where: { pseudonym }, select: { id: true } });
    if (!existing) return pseudonym;
  }
  return null;
}
