/**
 * Feste Pseudonyme für Studien-/Demo-User (siehe `prisma/seed.ts`).
 * Zum Zurücksetzen aller Testdaten: `npm run reset:test-users` → optional `npm run prisma:seed`.
 */
export const DEMO_TEST_PSEUDONYMS = [
  "F01",
  "F02",
  "F03",
  "F04",
  "F05",
  "T01",
  "T02",
  "T03",
  "T04",
  "T05",
  "E01",
  "E02",
  "E03",
  "E04",
  "E05",
  "P01",
  "P02",
  "P03",
  "P04",
  "P05",
] as const;

export type DemoTestPseudonym = (typeof DEMO_TEST_PSEUDONYMS)[number];

export function isDemoTestPseudonym(pseudonym: string | null | undefined): boolean {
  if (!pseudonym) return false;
  const p = pseudonym.trim().toUpperCase();
  return (DEMO_TEST_PSEUDONYMS as readonly string[]).includes(p);
}
