export const TASK_FORM_CHIP_KEYS = ["list", "tags", "duration", "reminder", "description"] as const;
export type TaskFormChipKey = (typeof TASK_FORM_CHIP_KEYS)[number];

export function isTaskFormChipKey(v: unknown): v is TaskFormChipKey {
  return typeof v === "string" && (TASK_FORM_CHIP_KEYS as readonly string[]).includes(v);
}

/** Präferenz `adaptive.taskFormChips`: nach Annahme des Chip-Vorschlags vorgemerkte Zusatzfelder. */
export function readAdaptiveTaskFormChips(v: unknown): { enabled: boolean; chipKeys: TaskFormChipKey[] } {
  if (!v || typeof v !== "object") return { enabled: false, chipKeys: [] };
  const o = v as Record<string, unknown>;
  const enabled = o.enabled === true;
  const raw = o.chipKeys;
  const chipKeys: TaskFormChipKey[] = [];
  if (Array.isArray(raw)) {
    for (const x of raw) {
      if (isTaskFormChipKey(x)) chipKeys.push(x);
    }
  }
  return { enabled, chipKeys };
}
