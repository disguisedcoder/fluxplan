import { redirectFromStartRoute } from "@/lib/nav/resolve-start-redirect";

/**
 * „Start“ in der Navigation: immer die **eingestellte Startansicht** (z. B. Heute, Kalender).
 * Ohne Session / ohne Willkommen → Weiterleitung auf `/willkommen`.
 */
export default async function StartRoute() {
  return redirectFromStartRoute();
}

