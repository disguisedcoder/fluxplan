import {
  reminderGuestDemoNote,
  reminderPreferenceExplanation,
} from "@/lib/adaptive/reminder-suggestion-copy";

export { reminderGuestDemoNote };

export type WhyExplanationRuleKey =
  | "view_preference"
  | "daily_focus"
  | "reminder_preference"
  | "calendar_conflict"
  | "adaptive_task_creation"
  | "adaptive_optional_fold"
  | "adaptive_optional_unfold";

export type ViewPreferenceHref = "/heute" | "/kalender" | "/aufgaben" | "/erstellen";

/**
 * Allgemeiner „Warum sehe ich das?“-Text pro Regel (reguläre Nutzer:innen).
 * Bei Gast-Demo wird darunter optional „Demo (Gast): …“ ergänzt — siehe {@link guestDemoNotes}.
 */
export const generalSuggestionExplanation = {
  daily_focus:
    "FluxPlan hat offene Aufgaben mit hoher Priorität sowie überfällige oder heute fällige Aufgaben erkannt. Der Vorschlag soll dir in „Heute“ Orientierung geben — es werden keine Aufgaben verschoben, gelöscht oder neu sortiert.",
  reminder_preference: reminderPreferenceExplanation,
  calendar_conflict:
    "An dem Fälligkeitstag der gerade angelegten Aufgabe summieren sich die geschätzten Minuten aller offenen Aufgaben auf mindestens 8 Stunden. FluxPlan warnt dich nur vor einem sehr vollen Tag und verschiebt nichts automatisch.",
  adaptive_task_creation:
    "In deinen letzten Aufgaben nutzt du bestimmte Zusatzfelder (z. B. Liste, Tags, Dauer, Erinnerung, Beschreibung) wiederholt. FluxPlan kann sie beim Anlegen als Chips vorschlagen — du wählst pro Aufgabe weiterhin selbst, was du brauchst.",
  adaptive_optional_fold:
    "In deinen letzten Aufgaben kommen Kategorie, Tags, Dauer, Erinnerung oder Beschreibung selten vor. FluxPlan kann den Bereich „Zusatzfelder“ beim Anlegen zunächst einklappen. Über „Weitere Felder“ oder in den Einstellungen bleibt alles jederzeit erreichbar.",
  adaptive_optional_unfold:
    "Du hast Zusatzfelder eingeklappt, nutzt Kategorie, Tags, Dauer, Erinnerung oder Beschreibung in letzter Zeit aber wieder häufig. FluxPlan kann den Bereich beim Anlegen wieder standardmäßig einblenden — du kannst ihn weiterhin einklappen.",
} as const;

/**
 * Zusatz nur für Gast-Demo (G01/G02) oder Workshop-Showcase — wenn Schwellen, Timing
 * oder Auslöser vom regulären Verhalten abweichen.
 */
export const guestDemoNotes: Record<WhyExplanationRuleKey, string> = {
  view_preference:
    "In der Gast-Demo zählen nur die letzten 8 Wechsel zwischen Heute, Kalender, Aufgaben und Erstellen; schon ab 3× zu einer Seite (und öfter als zu den anderen) erscheint der Vorschlag — im regulären Betrieb sind Fenster und Schwellen höher.",
  daily_focus:
    "In der Gast-Demo reicht das vorhandene Aufgaben-Muster (z. B. hohe Priorität und Tageslast) — der Hinweis erscheint beim Öffnen von „Heute“, ohne dass Aufgaben geändert werden.",
  reminder_preference: reminderGuestDemoNote,
  calendar_conflict:
    "In der Gast-Demo erscheint der Hinweis nach dem Anlegen einer Aufgabe an einem Tag mit mehreren großen Workshop-Blöcken — die 8-Stunden-Schwelle ist dort schon durch die Demo-Daten erreicht.",
  adaptive_task_creation:
    "In der Gast-Demo reicht eine ausführliche Aufgabe mit Zusatzfeldern als Muster (statt vieler Aufgaben). Der Vorschlag kann schon nach dem ersten passenden Anlegen erscheinen.",
  adaptive_optional_fold:
    "In der Gast-Demo zählt die zuletzt angelegte Aufgabe: War sie sehr kompakt (ohne Zusatzfelder), erscheint der Vorschlag schon beim ersten Mal — regulär werden mehrere Aufgaben ausgewertet.",
  adaptive_optional_unfold:
    "In der Gast-Demo reicht eine Aufgabe mit Zusatzfeldern, nachdem du eingeklappt hattest — der Vorschlag kann schon beim ersten passenden Anlegen erscheinen, statt erst nach einem längeren Muster.",
};

function labelForViewHref(href: ViewPreferenceHref): string {
  switch (href) {
    case "/heute":
      return "die Ansicht „Heute“";
    case "/kalender":
      return "den Kalender (Planungsansicht)";
    case "/aufgaben":
      return "die Aufgabenliste";
    case "/erstellen":
      return "die Seite „Erstellen“";
    default:
      return "diese Seite";
  }
}

/** Dynamischer Allgemein-Text für Startansicht (mit konkreten Zahlen aus der Regel). */
export function viewPreferenceExplanation(
  href: ViewPreferenceHref,
  count: number,
  sampleSize: number,
  threshold: number,
  isGuest: boolean,
): string {
  const target = labelForViewHref(href);
  const scope = isGuest
    ? `den letzten ${sampleSize} Wechseln zwischen Heute, Kalender, Aufgaben und Erstellen`
    : `deinen letzten ${sampleSize} Wechseln zu diesen Kernseiten`;
  return (
    `Dieser Vorschlag erscheint, weil du in ${scope} ${count}× ${target} geöffnet hast — mindestens ${threshold}× und öfter als die anderen Kernbereiche. ` +
    "FluxPlan schlägt vor, diese Seite als Startansicht zu speichern; du entscheidest mit Annehmen oder Ablehnen."
  );
}

export function formatGuestDemoExplanation(general: string, demoNote: string): string {
  const g = general.trim();
  const d = demoNote.trim();
  if (!d) return g;
  if (!g) return `Demo (Gast): ${d}`;
  return `${g}\n\nDemo (Gast): ${d}`;
}

export function buildWhyExplanation(
  ruleKey: WhyExplanationRuleKey,
  opts?: {
    isGuest?: boolean;
    guestNoteOverride?: string;
    view?: {
      href: ViewPreferenceHref;
      count: number;
      sampleSize: number;
      threshold: number;
    };
  },
): string {
  const general =
    ruleKey === "view_preference" && opts?.view
      ? viewPreferenceExplanation(
          opts.view.href,
          opts.view.count,
          opts.view.sampleSize,
          opts.view.threshold,
          Boolean(opts.isGuest),
        )
      : generalSuggestionExplanation[ruleKey as keyof typeof generalSuggestionExplanation];

  if (!opts?.isGuest) return general;

  const guestNote = opts.guestNoteOverride?.trim() || guestDemoNotes[ruleKey];
  return formatGuestDemoExplanation(general, guestNote);
}

/** @deprecated Nutze {@link viewPreferenceExplanation} — Alias für bestehende Imports. */
export function explanationFor(
  href: ViewPreferenceHref,
  count: number,
  sampleSize: number,
  opts: { threshold: number; isGuest: boolean },
): string {
  return viewPreferenceExplanation(href, count, sampleSize, opts.threshold, opts.isGuest);
}

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

/** Detail unter „Was passiert beim Annehmen?“ (Anpassungen). */
export const calendarConflictAcceptDetail = {
  lead: calendarConflictBannerStrapline,
  paragraphs: [
    "Es werden keine Aufgaben geändert oder verschoben. Nach Annahme zeigt der Kalender in Monats- und Wochenansicht an betroffenen Tagen ein Badge (z. B. „≈9h“) neben der Tageszahl, wenn die Summe geschätzter Minuten offener Aufgaben mit Fälligkeit an diesem Tag mindestens 8 Stunden beträgt.",
    "Das ist unabhängig von überlappenden Uhrzeiten im Stundenraster — die werden wie bisher separat markiert. Rückgängig im Verlauf blendet die Badges wieder aus.",
  ],
} as const;

export const dailyFocusAcceptImpact = {
  lead: "Beim Annehmen werden die überfälligen und heutigen Aufgaben in der To-Do-Liste der Ansicht „Heute“ rot hervorgehoben.",
  paragraphs: [
    "Es werden keine Aufgaben verschoben, gelöscht oder neu sortiert.",
    "Ohne Annahme blendet die To-Do-Liste überfällige Aufgaben in „Heute“ aus (du siehst nur heute Fälliges und Späteres); nach Annahme erscheinen überfällige Aufgaben dort ebenfalls und sind zusammen mit den heutigen rot markiert.",
    "Rückgängig im Verlauf stellt die Darstellung ohne Überfällige wieder her.",
  ],
} as const;

export const taskFormChipsAcceptImpact = {
  lead: taskFormChipsBannerStrapline,
  paragraphs: [
    "Auf „Neue Aufgabe“ und beim Bearbeiten erscheinen die vorgeschlagenen Zusatzfelder als aktive Chips — du wählst pro Aufgabe, was du wirklich brauchst.",
    "Bestehende Aufgaben bleiben unverändert. Unter Anpassungen kannst du die Annahme jederzeit per Rückgängig widerrufen.",
  ],
} as const;

export const taskFormOptionalFoldAcceptImpact = {
  lead: taskFormOptionalFoldBannerStrapline,
  paragraphs: [
    "Auf „Neue Aufgabe“ und beim Bearbeiten sind Kategorie, Tags, Dauer, Erinnerung und Beschreibung zunächst eingeklappt; „Weitere Felder“ zeigt sie bei Bedarf.",
    "Bestehende Aufgaben bleiben unverändert. Die Einstellung findest du auch unter Einstellungen; Rückgängig im Verlauf macht die Annahme rückgängig.",
  ],
} as const;

export const taskFormOptionalUnfoldAcceptImpact = {
  lead: taskFormOptionalUnfoldBannerStrapline,
  paragraphs: [
    "Auf „Neue Aufgabe“ und beim Bearbeiten sind die Zusatzfelder wieder standardmäßig sichtbar (die Einstellung „Zusatzfelder eingeklappt“ wird entfernt).",
    "Du kannst den Bereich weiterhin per Chip-Leiste oder unter Einstellungen steuern. Rückgängig im Verlauf stellt das Einklappen wieder her.",
  ],
} as const;

export const startViewAcceptImpactLead =
  "Beim Annehmen setzt du deine Startansicht fest und springst sofort zur gewählten Seite.";

export const startViewAcceptImpactParagraphs = [
  "Beim nächsten Öffnen der App landest du automatisch auf dieser Startansicht.",
  "Rückgängig im Verlauf stellt die vorherige Startansicht wieder her.",
] as const;
