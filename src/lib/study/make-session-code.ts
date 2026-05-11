import { randomBytes } from "node:crypto";

/**
 * Eindeutiger, lesbarer Session-Code (DB: `StudySession.sessionCode` @unique).
 * Zeitstempel allein reicht bei parallelen Requests nicht — daher zusätzliche Entropie.
 */
export function makeStudySessionCode(pseudonym: string): string {
  const stamp = new Date()
    .toISOString()
    .replaceAll(":", "")
    .replaceAll("-", "")
    .slice(0, 15);
  const suffix = randomBytes(4).toString("hex");
  return `S-${pseudonym}-${stamp}-${suffix}`;
}
