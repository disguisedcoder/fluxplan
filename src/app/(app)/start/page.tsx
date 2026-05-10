import { redirectFromStartRoute } from "@/lib/nav/resolve-start-redirect";

/**
 * „Start“ in der Navigation: immer die **eingestellte Startansicht** (z. B. Heute, Kalender).
 * Ohne Session / ohne Willkommen → Weiterleitung auf `/willkommen`.
 *
 * Hinweis: Nicht `StartRoute` nennen — Next/React nutzt den Funktionsnamen für Performance-Marks;
 * „StartRoute“ kann dort zu `Performance.measure`-Fehlern führen.
 */
export default async function StartNavPage() {
  return redirectFromStartRoute();
}

