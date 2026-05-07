import { prisma } from "@/lib/db/prisma";
import type { AdaptiveRule } from "../types";
import { thresholdMultiplier } from "../engineConfig";
import { normalizeStartViewHref } from "@/lib/settings/start-view";

const SAMPLE = 24;

type ViewTarget = {
  id: string;
  href: "/kalender" | "/aufgaben" | "/erstellen";
  match: (to: string) => boolean;
};

const VIEW_TARGETS: ViewTarget[] = [
  {
    id: "calendar",
    href: "/kalender",
    match: (to) => to === "/kalender" || to === "/planning",
  },
  {
    id: "tasks",
    href: "/aufgaben",
    match: (to) => to === "/aufgaben" || to === "/tasks",
  },
  {
    id: "create",
    href: "/erstellen",
    match: (to) => to === "/erstellen",
  },
];

function extractTo(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null) return null;
  const to = (metadata as Record<string, unknown>).to;
  return typeof to === "string" ? to : null;
}

function titleFor(href: ViewTarget["href"]): string {
  switch (href) {
    case "/kalender":
      return "Kalender als Startansicht?";
    case "/aufgaben":
      return "Aufgabenliste als Startansicht?";
    case "/erstellen":
      return "Erstellen als Startansicht?";
    default:
      return "Startansicht anpassen?";
  }
}

function explanationFor(href: ViewTarget["href"], count: number, sampleSize: number): string {
  const where =
    href === "/kalender"
      ? "Kalender oder Planungsansicht"
      : href === "/aufgaben"
        ? "Aufgabenliste"
        : "die Seite „Erstellen“";
  return `Dieser Vorschlag erscheint, weil du in den letzten ${sampleSize} registrierten Ansichten ${count}× zu ${where} gewechselt bist — häufiger als zu den anderen vorgeschlagenen Bereichen.`;
}

export const viewPreferenceRule: AdaptiveRule = {
  key: "view_preference",
  name: "Ansichtspräferenz",
  description:
    "Schlägt vor, die am häufigsten besuchte Kernansicht (Kalender, Aufgaben, Erstellen) als Startansicht zu setzen.",
  async evaluate(ctx) {
    if (!ctx.screen) return null;

    const existing = await prisma.adaptiveSuggestion.findFirst({
      where: { userId: ctx.userId, ruleKey: "view_preference", status: "pending" },
      select: { id: true },
    });
    if (existing) return null;

    // Wenn der Nutzer gerade erst einen View-Preference-Vorschlag angenommen hat, nicht erneut nerven.
    // (Die Startansicht ist dann ohnehin gesetzt.)
    const recentlyAccepted = await prisma.adaptiveSuggestion.findFirst({
      where: {
        userId: ctx.userId,
        ruleKey: "view_preference",
        status: "accepted",
        respondedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (recentlyAccepted) return null;

    const recent = await prisma.taskInteraction.findMany({
      where: { userId: ctx.userId, type: "view_changed" },
      orderBy: { createdAt: "desc" },
      take: SAMPLE,
      select: { metadata: true },
    });

    const baseThreshold = 4;
    const mult = ctx.config ? thresholdMultiplier(ctx.config) : 1;
    const threshold = Math.max(2, Math.ceil(baseThreshold * mult));

    const counts = VIEW_TARGETS.map((t) => ({
      t,
      count: recent.filter((r) => {
        const to = extractTo(r.metadata);
        return to !== null && t.match(to);
      }).length,
    }));

    let winner: (typeof counts)[number] | null = null;
    for (const row of counts) {
      if (row.count < threshold) continue;
      if (!winner || row.count > winner.count) winner = row;
    }
    if (!winner) return null;

    const href = winner.t.href;

    // Falls die Startansicht bereits auf diese Route zeigt, keinen Vorschlag erzeugen.
    const startPref = await prisma.userPreference.findUnique({
      where: { userId_key: { userId: ctx.userId, key: "startView" } },
      select: { value: true },
    });
    const raw =
      startPref?.value && typeof startPref.value === "object" && startPref.value !== null
        ? String((startPref.value as Record<string, unknown>).href ?? "")
        : "";
    if (normalizeStartViewHref(raw) === href) return null;

    return {
      ruleKey: "view_preference",
      type: "start_view",
      title: titleFor(href),
      explanation: explanationFor(href, winner.count, recent.length),
      payload: {
        suggestedStartView: href,
        signal: {
          targetId: winner.t.id,
          count: winner.count,
          sampleSize: recent.length,
          threshold,
        },
      },
    };
  },
};
