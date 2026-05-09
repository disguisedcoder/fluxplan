/** Client-Event: andere Komponenten sollen Präferenzen neu laden (z. B. nach adaptivem Annehmen). */
export const FLUXPLAN_PREFERENCES_CHANGED = "fluxplan-preferences-changed";

export function notifyFluxplanPreferencesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FLUXPLAN_PREFERENCES_CHANGED));
}
