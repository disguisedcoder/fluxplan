export const TASK_FIELD_SUGGESTION_LIMIT = 5;

type TaskListRow = { listName: string | null };
type TaskTagRow = { tags: string[] };

/** „Studium & Arbeit“ → [„Studium“, „Arbeit“]; einfache Namen bleiben ein Eintrag. */
export function splitCategoryNameParts(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(/\s*(?:&|\/|,)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [trimmed];
}

/** Häufigste Kategorien (listName), absteigend nach Nutzung — zusammengesetzte Namen einzeln. */
export function topListNamesFromTasks(tasks: TaskListRow[], limit = TASK_FIELD_SUGGESTION_LIMIT): string[] {
  const counts = new Map<string, number>();
  const labels = new Map<string, string>();

  for (const t of tasks) {
    const name = t.listName?.trim();
    if (!name) continue;
    for (const part of splitCategoryNameParts(name)) {
      const key = part.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!labels.has(key)) labels.set(key, part);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (labels.get(a[0]) ?? a[0]).localeCompare(labels.get(b[0]) ?? b[0], "de"))
    .slice(0, limit)
    .map(([key]) => labels.get(key) ?? key);
}

/** Häufigste Tags (ohne führendes #), absteigend nach Vorkommen in Aufgaben. */
export function topTagsFromTasks(tasks: TaskTagRow[], limit = TASK_FIELD_SUGGESTION_LIMIT): string[] {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    for (const raw of t.tags) {
      const tag = raw.replace(/^#+/, "").trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"))
    .slice(0, limit)
    .map(([key]) => {
      for (const t of tasks) {
        for (const raw of t.tags) {
          const tag = raw.replace(/^#+/, "").trim();
          if (tag && tag.toLowerCase() === key) return tag;
        }
      }
      return key;
    });
}
