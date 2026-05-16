import {
  calendarConflictBannerStrapline,
  taskFormChipsBannerStrapline,
  taskFormOptionalFoldBannerStrapline,
  taskFormOptionalUnfoldBannerStrapline,
} from "@/lib/adaptive/suggestion-explanation";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarClock,
  ChevronsUpDown,
  Focus,
  Home,
  PanelBottomClose,
  Sparkles,
  Wand2,
} from "lucide-react";

export type SuggestionAccent = "sky" | "violet" | "amber" | "rose";

export type SuggestionVisualMeta = {
  Icon: LucideIcon;
  accent: SuggestionAccent;
  /** Kurz-Badge neben dem Regel-Typ */
  categoryShort: string;
  /** Ein Satz unter der Überschrift im Detail */
  strapline: string;
};

const DEFAULT_META: SuggestionVisualMeta = {
  Icon: Sparkles,
  accent: "violet",
  categoryShort: "Adaptiv",
  strapline: "FluxPlan schlägt eine kleine Anpassung vor.",
};

export function getSuggestionVisualMeta(ruleKey: string): SuggestionVisualMeta {
  switch (ruleKey) {
    case "daily_focus":
      return {
        Icon: Focus,
        accent: "sky",
        categoryShort: "Überblick",
        strapline:
          "Beim Annehmen werden die überfälligen und heutigen Aufgaben in der To-Do-Liste der Ansicht „Heute“ rot hervorgehoben.",
      };
    case "adaptive_task_creation":
      return {
        Icon: Wand2,
        accent: "violet",
        categoryShort: "Formular",
        strapline: taskFormChipsBannerStrapline,
      };
    case "adaptive_optional_fold":
      return {
        Icon: PanelBottomClose,
        accent: "sky",
        categoryShort: "Kompakt",
        strapline: taskFormOptionalFoldBannerStrapline,
      };
    case "adaptive_optional_unfold":
      return {
        Icon: ChevronsUpDown,
        accent: "sky",
        categoryShort: "Formular",
        strapline: taskFormOptionalUnfoldBannerStrapline,
      };
    case "calendar_conflict":
      return {
        Icon: CalendarClock,
        accent: "amber",
        categoryShort: "Kalender",
        strapline: calendarConflictBannerStrapline,
      };
    case "view_preference":
      return {
        Icon: Home,
        accent: "violet",
        categoryShort: "Start",
        strapline: "Beim Annehmen setzt du deine Startansicht fest und springst sofort hin.",
      };
    case "reminder_preference":
      return {
        Icon: Bell,
        accent: "rose",
        categoryShort: "Erinnerung",
        strapline:
          "Mit Annehmen legst du für diese Aufgabe eine Erinnerung fest — du nutzt Erinnerungen ohnehin oft. Zeit und Datum kannst du jederzeit ändern oder die Erinnerung wieder entfernen.",
      };
    default:
      return DEFAULT_META;
  }
}

/** Linker Akzent am Listeneintrag / Detail-Karte */
export function suggestionAccentBorderClass(accent: SuggestionAccent): string {
  switch (accent) {
    case "sky":
      return "border-l-sky-500 dark:border-l-sky-400";
    case "violet":
      return "border-l-violet-500 dark:border-l-violet-400";
    case "amber":
      return "border-l-amber-500 dark:border-l-amber-400";
    case "rose":
      return "border-l-rose-500 dark:border-l-rose-400";
    default:
      return "border-l-muted-foreground";
  }
}

/** Hintergrund für das Icon in der Liste */
export function suggestionIconWrapClass(accent: SuggestionAccent, active: boolean): string {
  if (active) {
    switch (accent) {
      case "sky":
        return "bg-sky-500/20 text-sky-800 dark:text-sky-200";
      case "violet":
        return "bg-violet-500/20 text-violet-800 dark:text-violet-200";
      case "amber":
        return "bg-amber-500/20 text-amber-900 dark:text-amber-100";
      case "rose":
        return "bg-rose-500/20 text-rose-800 dark:bg-amber-400/15 dark:text-amber-100";
      default:
        return "bg-primary/15 text-primary";
    }
  }
  switch (accent) {
    case "sky":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "violet":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "amber":
      return "bg-amber-500/10 text-amber-800 dark:text-amber-200";
    case "rose":
      return "bg-rose-500/10 text-rose-700 dark:bg-amber-400/10 dark:text-amber-100";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/** Kleines Kategorie-Badge (Detail / optional in Liste) */
export function suggestionCategoryPillClass(accent: SuggestionAccent): string {
  switch (accent) {
    case "sky":
      return "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100";
    case "violet":
      return "border-violet-500/40 bg-violet-500/10 text-violet-900 dark:text-violet-100";
    case "amber":
      return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-50";
    case "rose":
      return "border-rose-500/40 bg-rose-500/10 text-rose-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100";
    default:
      return "border-border bg-muted text-foreground";
  }
}

/** Info-Band unter der Überschrift (Detail) */
export function suggestionStraplineClass(accent: SuggestionAccent): string {
  switch (accent) {
    case "sky":
      return "border-sky-500/25 bg-sky-500/10 text-sky-950 dark:text-sky-50";
    case "violet":
      return "border-violet-500/25 bg-violet-500/10 text-violet-950 dark:text-violet-50";
    case "amber":
      return "border-amber-500/25 bg-amber-500/10 text-amber-950 dark:text-amber-50";
    case "rose":
      return "border-rose-500/25 bg-rose-500/10 text-rose-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-50";
    default:
      return "border-border/60 bg-muted/40 text-foreground";
  }
}
