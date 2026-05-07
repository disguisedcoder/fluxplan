/**
 * Admin-Oberfläche (z. B. alle Demo-Testuser zurücksetzen): nur für Pseudonyme aus
 * `FLUXPLAN_ADMIN_PSEUDONYMS` (kommagetrennt, Standard: `ADMIN`).
 */
export function getAdminPseudonyms(): string[] {
  const raw = process.env.FLUXPLAN_ADMIN_PSEUDONYMS ?? "admin";
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function isAdminPseudonym(pseudonym: string | null | undefined): boolean {
  if (!pseudonym) return false;
  const p = pseudonym.trim().toUpperCase();
  return getAdminPseudonyms().includes(p);
}
