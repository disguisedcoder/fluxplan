import { prisma } from "@/lib/db/prisma";
import { whereAdaptiveSuggestionStudySession } from "@/lib/adaptive/suggestion-session-scope";
import type { AdaptiveRule } from "../types";
import { thresholdMultiplier } from "../engineConfig";
import { normalizeStartViewHref } from "@/lib/settings/start-view";

/** Nur Wechsel zu diesen Kernrouten zählen (andere Seiten füllen das Fenster nicht). */
const MAX_RAW_VIEW_EVENTS_GUEST = 40;
const MAX_RAW_VIEW_EVENTS_DEFAULT = 120;
/** Gast: ab so vielen Kern-Wechseln im Fenster; sonst strenger für reproduzierbare Tests. */
const CORE_WINDOW_GUEST = 8;
const CORE_WINDOW_DEFAULT = 28;
const THRESHOLD_BASE_GUEST = 3;
const THRESHOLD_BASE_DEFAULT = 7;

type ViewTarget = {
  id: string;
  href: "/heute" | "/kalender" | "/aufgaben" | "/erstellen";
  match: (to: string) => boolean;
};

const VIEW_TARGETS: ViewTarget[] = [
  {
    id: "today",
    href: "/heute",
    match: (to) => to === "/heute" || to === "/today",
  },
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
    case "/heute":
      return "„Heute“ als Startansicht?";
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

function explanationFor(
  href: ViewTarget["href"],
  count: number,
  sampleSize: number,
  opts: { threshold: number; isGuest: boolean },
): string {
  const where =
    href === "/heute"
      ? "„Heute“"
      : href === "/kalender"
        ? "Kalender oder Planungsansicht"
        : href === "/aufgaben"
          ? "Aufgabenliste"
          : "die Seite „Erstellen“";
  const scope = opts.isGuest
    ? `den letzten ${sampleSize} Wechseln zu Heute, Kalender, Aufgaben oder Erstellen`
    : `den letzten ${sampleSize} solchen Wechseln`;
  return `Dieser Vorschlag erscheint, weil du in ${scope} ${count}× zu ${where} gewechselt bist (Schwelle: mindestens ${opts.threshold}×, häufiger als zu den anderen Kernbereichen).`;
}

export const viewPreferenceRule: AdaptiveRule = {
  key: "view_preference",
  name: "Ansichtspräferenz",
  description:
    "Wertet wiederholte Wechsel zu „Heute“, Kalender, Aufgaben oder Erstellen aus und schlägt die am häufigsten angesteuerte Route als Startansicht vor (Gast: ab 3 Kern-Wechseln; sonst ab 7).",
  async evaluate(ctx) {
    if (!ctx.screen) return null;

    const existing = await prisma.adaptiveSuggestion.findFirst({
      where: {
        userId: ctx.userId,
        ruleKey: "view_preference",
        status: "pending",
        ...whereAdaptiveSuggestionStudySession(ctx.studySessionId),
      },
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
        ...whereAdaptiveSuggestionStudySession(ctx.studySessionId),
      },
      select: { id: true },
    });
    if (recentlyAccepted) return null;

    const isGuest = Boolean(ctx.isGuestStudyUser);
    const coreWindow = isGuest ? CORE_WINDOW_GUEST : CORE_WINDOW_DEFAULT;
    const maxRaw = isGuest ? MAX_RAW_VIEW_EVENTS_GUEST : MAX_RAW_VIEW_EVENTS_DEFAULT;

    const recentRaw = await prisma.taskInteraction.findMany({
      where: { userId: ctx.userId, type: "view_changed" },
      orderBy: { createdAt: "desc" },
      take: maxRaw,
      select: { metadata: true },
    });

    const recent = recentRaw
      .filter((r) => {
        const to = extractTo(r.metadata);
        return to !== null && VIEW_TARGETS.some((t) => t.match(to));
      })
      .slice(0, coreWindow);

    const baseThreshold = isGuest ? THRESHOLD_BASE_GUEST : THRESHOLD_BASE_DEFAULT;
    const mult = ctx.config ? thresholdMultiplier(ctx.config) : 1;
    const threshold = Math.max(isGuest ? 2 : 4, Math.ceil(baseThreshold * mult));

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
      explanation: explanationFor(href, winner.count, recent.length, { threshold, isGuest }),
      payload: {
        suggestedStartView: href,
        signal: {
          targetId: winner.t.id,
          count: winner.count,
          sampleSize: recent.length,
          threshold,
          guest: isGuest,
        },
      },
    };
  },
};
