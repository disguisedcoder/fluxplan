import type { DemoRoleKey, DemoTaskInput } from "./types";
import { at } from "./time";

/** Ca. zwei Monate verteilt (1..DEMO_TIMELINE_DAYS), plus Kernaufgaben in den Rollen-Dateien → insgesamt 50–100+ Tasks. */
export const DEMO_TIMELINE_DAYS = 60;

/** Familienalltag: nachvollziehbar, wenig Fachjargon. */
const FAM_ROT = [
  "Kindergarten-Besuch vorbereiten",
  "Elternabend Schule",
  "Wocheneinkauf planen",
  "Kinderarzt: Uhrzeit bestätigen",
  "Großeltern zum Kaffee einladen",
  "Ferienbetreuung anfragen",
  "Sporttasche für Training packen",
  "Geburtstagsgeschenk besorgen",
  "Schulranzen und Trinkflasche",
  "Hausarzt: Impfpass mitnehmen",
  "Kita-Ausflug: Einverständnis unterschreiben",
  "Wochenend-Einkauf Bio-Markt",
  "Schulfest: Kuchen mitbringen",
  "Schwimmkurs anmelden",
  "Zahnarzt Familie",
  "Spielplatz-Treffen mit Freunden",
] as const;

/** Studium / Projekt / Arbeit: realistisch, nicht „Tool-Sprache“. */
const TP_ROT = [
  "Kapitel für nächste Woche lesen",
  "Betreuerin kurz informieren",
  "Feedback aus letzter Runde einarbeiten",
  "Präsentation üben (15 Min)",
  "Literaturliste ergänzen",
  "Fragebogen für Studie vorbereiten",
  "Notizen aus Meeting ordnen",
  "Deadline-Check nächste Abgabe",
  "Quellen für Abschnitt 3 sammeln",
  "Kurzüberblick für Betreuung schreiben",
  "Recherche: zwei Interviews festlegen",
  "Zeitfenster für Fokusblock reservieren",
  "Korrekturlesen Runde 1",
  "Abbildungen beschriften",
  "Prüfungstermin im Kalender eintragen",
  "Gruppenarbeit abstimmen",
] as const;

/** Eval-/Organisationsrolle: wie eine Person, die viele Baustellen im Blick hat — ohne UI-Technikbegriffe. */
const EV_ROT = [
  "Offene Punkte vor Abgabe sammeln",
  "Zweiten Termin nachfassen",
  "Rückruf beim Handwerksbetrieb",
  "Versicherungsschreiben lesen",
  "Rechnungen abheften",
  "Fahrplan für Ausflug skizzieren",
  "Nachricht an Verein beantworten",
  "Paket in der Filiale abholen",
  "Termin mit Kollegin vorbereiten",
  "Wichtige E-Mail heute noch raus",
  "Unterlagen für Behörde kopieren",
  "Wochenübersicht mit Partner abstimmen",
  "Erinnerung: Vertrag verlängern",
  "Fotos vom Wochenende sortieren",
  "Spende / Mitgliedsbeitrag überweisen",
  "Auto: Tanken und Scheibenwischer",
] as const;

function linesFor(role: DemoRoleKey): readonly string[] {
  if (role === "familienplanner") return FAM_ROT;
  if (role === "taskplanner") return TP_ROT;
  return EV_ROT;
}

function listFor(role: DemoRoleKey): string {
  if (role === "familienplanner") return "Familie";
  if (role === "taskplanner") return "Studium";
  return "Organisation";
}

function tagsFor(role: DemoRoleKey): string[] {
  if (role === "familienplanner") return ["alltag", "kalender"];
  if (role === "taskplanner") return ["projekt", "fokus"];
  return ["termine", "alltag"];
}

function lineForGuestDay(d: number): { base: string; listName: string; tags: string[] } {
  const mod = d % 3;
  if (mod === 0) {
    const base = FAM_ROT[d % FAM_ROT.length]!;
    return { base, listName: "Zuhause & Kita", tags: ["familie", "alltag"] };
  }
  if (mod === 1) {
    const base = TP_ROT[d % TP_ROT.length]!;
    return { base, listName: "Studium & Arbeit", tags: ["projekt", "fokus"] };
  }
  const base = EV_ROT[d % EV_ROT.length]!;
  return { base, listName: "Termine & Orga", tags: ["termine", "alltag"] };
}

/**
 * Gast: **Mischung** aus Familien-, Studiums- und Organisations-Themen (rotierend),
 * damit Kalender & Listen voll wirken, ohne eine Rolle zu „verraten“.
 */
export function buildGuestMixedTimelineTasks(now: Date): DemoTaskInput[] {
  const out: DemoTaskInput[] = [];
  for (let d = 1; d <= DEMO_TIMELINE_DAYS; d++) {
    const { base, listName, tags } = lineForGuestDay(d);
    const title = `${base} (+${d}T)`;
    const slotHour = 8 + (d % 9);
    const slotMin = (d * 11) % 55;
    const noDate = d % 11 === 0;
    const withReminder = !noDate && d % 4 === 0;
    out.push({
      title,
      priority: d % 8 === 0 ? "high" : d % 7 === 0 ? "low" : "medium",
      dueDate: noDate ? null : at(now, d, slotHour, slotMin),
      reminderAt:
        withReminder && !noDate
          ? at(now, d, Math.max(7, slotHour - 1), Math.min(50, slotMin + 5))
          : null,
      listName,
      tags,
      estimatedMinutes: 20 + (d % 7) * 10,
    });
  }
  return out;
}

/**
 * Eine Task pro Kalendertag im Horizont (über Wochen verteilt),
 * mit wechselnden Uhrzeiten, Prioritäten, optional Erinnerung, gelegentlich ohne Datum.
 */
export function buildTwoMonthTimelineTasks(role: DemoRoleKey, now: Date): DemoTaskInput[] {
  const lines = linesFor(role);
  const out: DemoTaskInput[] = [];
  for (let d = 1; d <= DEMO_TIMELINE_DAYS; d++) {
    const line = lines[d % lines.length]!;
    const title = `${line} (+${d}T)`;
    const slotHour = 8 + (d % 9);
    const slotMin = (d * 11) % 55;
    const noDate = d % 11 === 0;
    const withReminder = !noDate && d % 4 === 0;
    out.push({
      title,
      priority: d % 8 === 0 ? "high" : d % 7 === 0 ? "low" : "medium",
      dueDate: noDate ? null : at(now, d, slotHour, slotMin),
      reminderAt:
        withReminder && !noDate
          ? at(now, d, Math.max(7, slotHour - 1), Math.min(50, slotMin + 5))
          : null,
      listName: listFor(role),
      tags: tagsFor(role),
      estimatedMinutes: 20 + (d % 7) * 10,
    });
  }
  return out;
}
