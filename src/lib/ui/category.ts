export type CategoryTone =
  | "studium"
  | "research"
  | "prototype"
  | "review"
  | "apps"
  | "eval"
  | "text"
  | "neutral";

const TONE_BY_LABEL: Record<string, CategoryTone> = {
  studium: "studium",
  bachelor: "studium",
  bachelorarbeit: "studium",
  uni: "studium",
  research: "research",
  recherche: "research",
  literatur: "research",
  prototype: "prototype",
  prototyp: "prototype",
  fluxplan: "prototype",
  review: "review",
  qg: "review",
  apps: "apps",
  evaluation: "eval",
  eval: "eval",
  ux: "eval",
  text: "text",
  schreiben: "text",
};

export function categoryToneFor(label?: string | null): CategoryTone {
  if (!label) return "neutral";
  const key = label.trim().toLowerCase();
  return TONE_BY_LABEL[key] ?? "neutral";
}

export function categoryBadgeClass(tone: CategoryTone): string {
  switch (tone) {
    case "studium":
      return "bg-violet-100 text-violet-700 border-violet-200";
    case "research":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "prototype":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "review":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "apps":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "eval":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "text":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "neutral":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function pickPrimaryCategory(task: {
  listName: string | null;
  tags: string[];
}): string | null {
  if (task.listName) return task.listName;
  if (task.tags.length > 0) return task.tags[0];
  return null;
}
