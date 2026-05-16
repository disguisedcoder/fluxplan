import {
  reminderGuestDemoNote,
  reminderPreferenceExplanation,
} from "@/lib/adaptive/reminder-suggestion-copy";

export { reminderGuestDemoNote };

/**
 * Standard-Erklärungen für „Warum sehe ich das?“ (wie bei regulären Nutzer:innen aus den Regeln).
 * Gast-Workshop: allgemeiner Text zuerst, danach optional Demo (Gast): …
 */
export const generalSuggestionExplanation = {
  daily_focus:
    "Dieser Vorschlag basiert auf offenen Aufgaben mit hoher Priorität sowie überfälligen oder heutigen Aufgaben.",
  reminder_preference: reminderPreferenceExplanation,
  calendar_conflict:
    "Die Summe der geschätzten Minuten für alle offenen Aufgaben an diesem Tag liegt bei mindestens 8 Stunden. FluxPlan verschiebt nichts automatisch.",
  adaptive_task_creation:
    "Dieser Vorschlag erscheint, weil du in letzter Zeit bestimmte Zusatzfelder oft nutzt. FluxPlan kann sie als Chips vorschlagen – du behältst die Kontrolle.",
  adaptive_optional_fold:
    "Du nutzt Kategorie, Tags, Dauer, Erinnerung oder Beschreibung in letzter Zeit kaum. FluxPlan kann den Bereich „Zusatzfelder“ beim Anlegen zunächst einklappen – du kannst ihn jederzeit wieder aufklappen oder alles unter Einstellungen zurücksetzen.",
  adaptive_optional_unfold:
    "Du nutzt Kategorie, Tags, Dauer, Erinnerung oder Beschreibung in letzter Zeit wieder häufig. FluxPlan kann den Bereich „Zusatzfelder“ beim Anlegen wieder standardmäßig einblenden – du kannst ihn jederzeit einklappen oder unter Einstellungen anpassen.",
} as const;

/** Farbige Info-Box: Auswirkung von „Annehmen“ + betroffene Seiten (Banner / Anpassungen). */
export const taskFormChipsBannerStrapline =
  "Mit Annehmen werden auf „Neue Aufgabe“ und beim Bearbeiten vorgeschlagene Zusatzfelder als Chips angezeigt — du entscheidest weiterhin pro Aufgabe.";

export const taskFormOptionalFoldBannerStrapline =
  "Mit Annehmen werden auf „Neue Aufgabe“ und beim Bearbeiten die Zusatzfelder zunächst eingeklappt; „Weitere Felder“ blendet sie jederzeit wieder ein.";

export const taskFormOptionalUnfoldBannerStrapline =
  "Mit Annehmen werden auf „Neue Aufgabe“ und beim Bearbeiten die Zusatzfelder wieder standardmäßig sichtbar.";

/** Kurz-Strapline Banner / Anpassungen (Link „Anpassungen“ in der Komponente). */
export const calendarConflictBannerStrapline =
  "Beim Annehmen markiert der Kalender in Monats- und Wochenansicht stark verplante Tage mit einem Badge (z. B. „≈9h“).";

/** Detail unter „Was passiert beim Annehmen“ (Anpassungen). */
export const calendarConflictAcceptDetail = {
  main:
    "Es werden keine Aufgaben geändert oder verschoben. Nach Annahme zeigt der Kalender in Monats- und Wochenansicht an betroffenen Tagen ein Badge (z. B. „≈9h“) neben der Tageszahl, wenn die Summe geschätzter Minuten offener Aufgaben mit Fälligkeit an diesem Tag mindestens 8 Stunden beträgt.",
  note: "Das ist unabhängig von überlappenden Uhrzeiten im Stundenraster — die werden wie bisher separat markiert. Rückgängig im Verlauf blendet die Badges wieder aus.",
} as const;

export function formatGuestDemoExplanation(general: string, demoNote: string): string {
  const g = general.trim();
  const d = demoNote.trim();
  if (!d) return g;
  if (!g) return `Demo (Gast): ${d}`;
  return `${g}\n\nDemo (Gast): ${d}`;
}
