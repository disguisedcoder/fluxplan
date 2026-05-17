/** UI-Texte für Vorschlags-Snooze (API-Action bleibt `snooze`). */
export const SUGGESTION_SNOOZE_BUTTON_LABEL = "Später erinnern";
/** @deprecated Alias — bitte `SUGGESTION_SNOOZE_BUTTON_LABEL` verwenden */
export const REMINDER_SNOOZE_BUTTON_LABEL = SUGGESTION_SNOOZE_BUTTON_LABEL;
/** Verlauf / Statistik (Vergangenheitsform wie „Angenommen“, „Abgelehnt“) */
export const SUGGESTION_SNOOZE_STATUS_LABEL = "Später erinnert";
export const REMINDER_SNOOZE_PERSONALIZATION_CARD_TITLE = "Erinnerungs-Vorschläge pausieren";
export const REMINDER_SNOOZE_PERSONALIZATION_LINK_LABEL = REMINDER_SNOOZE_PERSONALIZATION_CARD_TITLE;

/** „Warum sehe ich das?“ — allgemeiner Teil */
export const reminderPreferenceExplanation =
  "Bei vielen deiner letzten Aufgaben hast du selbst eine Erinnerung gesetzt. Diese Aufgabe hat noch keine — deshalb schlägt FluxPlan einen passenden Zeitpunkt vor (du kannst Zeit und Datum jederzeit ändern oder die Erinnerung wieder entfernen).";

/** Zusatz für Gast-Demo (G01/G02) */
export const reminderGuestDemoNote =
  "In der Gast-Demo reicht bereits eine Aufgabe mit Erinnerung als Muster (statt mehrerer). Die Workshop-Aufgabe „Rückmeldung bis heute Abend“ hat noch keine Erinnerung — du kannst annehmen, ablehnen oder „Später erinnern“.";

/** Banner / Anpassungen — Kurzzeile über den Buttons */
export const reminderAcceptStrapline =
  "Mit Annehmen legst du für diese Aufgabe eine Erinnerung fest — du nutzt Erinnerungen ohnehin oft. Zeit und Datum kannst du jederzeit ändern oder die Erinnerung wieder entfernen.";

export const reminderAcceptDetail = {
  main: "Die Erinnerung gilt nur für diese eine Aufgabe. Künftige Aufgaben bekommen einen ähnlichen Vorschlag nur dann, wenn du sie ohne Erinnerung anlegst und dein Nutzungsmuster weiter passt.",
  onAccept:
    "Annehmen übernimmt den vorgeschlagenen Zeitpunkt an dieser Aufgabe. Eine laufende Pause für Erinnerungs-Vorschläge endet dabei.",
  onUndo: "Rückgängig im Verlauf entfernt die Erinnerung an dieser Aufgabe wieder.",
  onSnooze: `„Später erinnern“ blendet diesen Vorschlag aus und pausiert ähnliche Hinweise für ein paar Tage — einstellbar unter Personalisierung oder im Verlauf bei diesem Eintrag.`,
} as const;

export function suggestionSnoozeButtonLabel(_ruleKey?: string): string {
  return SUGGESTION_SNOOZE_BUTTON_LABEL;
}

export function suggestionSnoozeStatusLabel(_ruleKey?: string): string {
  return SUGGESTION_SNOOZE_STATUS_LABEL;
}

export function suggestedReminderAtFromPayload(payload: unknown): Date | null {
  const obj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const raw = obj?.proposedReminderAt;
  if (typeof raw !== "string") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatReminderProposedDateTimeDe(d: Date): string {
  return d.toLocaleString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatReminderSnoozeDateDe(d: Date): string {
  return d.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function reminderSnoozeToastTitle(): string {
  return "Später erinnern gespeichert.";
}

export function reminderSnoozeToastDescription(
  until: Date,
  days: number,
  context: "banner" | "detail",
): string {
  const date = formatReminderSnoozeDateDe(until);
  if (context === "banner") {
    return `Neue Erinnerungs-Vorschläge frühestens ab ${date} (${days} Kalendertage). Unter Anpassungen → Verlauf kannst du Frist und Tage ändern.`;
  }
  return `Frühestens wieder ab ${date} (${days} Kalendertage). Details siehst du direkt unter diesem Vorschlag.`;
}

export function reminderSnoozeToastDescriptionFallback(): string {
  return `Frist und Tage: Anpassungen → Verlauf oder Personalisierung → „${REMINDER_SNOOZE_PERSONALIZATION_CARD_TITLE}“.`;
}
