import type { Prisma } from "@prisma/client";

import { CALENDAR_OVERLOAD_HIGHLIGHT_PREF_KEY } from "@/lib/settings/calendar-overload-highlight";
import { DAILY_FOCUS_LIST_HIGHLIGHT_PREF_KEY } from "@/lib/settings/daily-focus-list-highlight";
import {
  REMINDER_SNOOZE_DAYS_PREF_KEY,
  REMINDER_SNOOZE_UNTIL_PREF_KEY,
} from "@/lib/settings/reminder-snooze";

/**
 * Von Vorschlägen gesetzte bzw. adaptiv begleitende Einstellungen — bei Session-Reset leeren.
 * `adaptive.enabled` (Baseline vs. adaptiv) liegt in separaten Upserts und wird hier nicht gelöscht.
 */
const ADAPTIVE_OUTCOME_PREF_KEYS_WITHOUT_LEVEL = [
  "startView",
  "taskFormOptionalFold",
  "adaptive.taskFormChips",
  REMINDER_SNOOZE_DAYS_PREF_KEY,
  REMINDER_SNOOZE_UNTIL_PREF_KEY,
  DAILY_FOCUS_LIST_HIGHLIGHT_PREF_KEY,
  CALENDAR_OVERLOAD_HIGHLIGHT_PREF_KEY,
] as const;

const INTERVENTION_LEVEL_KEY = "adaptive.interventionLevel" as const;

export type DeleteAdaptiveOutcomeOptions = {
  /** Workshop-Gast: eingestellte Eingriffsstufe nach Reset beibehalten. */
  preserveInterventionLevel?: boolean;
};

export async function deleteAdaptiveOutcomePreferences(
  tx: Prisma.TransactionClient,
  userId: string,
  options?: DeleteAdaptiveOutcomeOptions,
): Promise<number> {
  const keys: string[] = [...ADAPTIVE_OUTCOME_PREF_KEYS_WITHOUT_LEVEL];
  if (!options?.preserveInterventionLevel) {
    keys.push(INTERVENTION_LEVEL_KEY);
  }
  const byKey = await tx.userPreference.deleteMany({
    where: {
      userId,
      OR: [{ key: { in: keys } }, { key: { startsWith: "rule.cooldown." } }],
    },
  });
  return byKey.count;
}
