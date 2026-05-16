import type { StudyVariant } from "@prisma/client";

import type { DemoRoleKey } from "@/lib/demo/types";
import type { UserExportPayload } from "./build-user-export";
import { flattenMetadata } from "./build-user-export";

const SUGGESTION_REACTION_TYPES = new Set([
  "suggestion_accepted",
  "suggestion_rejected",
  "suggestion_snoozed",
  "suggestion_undone",
]);

export type TeilnehmerExportRow = {
  userPseudonym: string;
  inferredRole: DemoRoleKey;
  sessionCount: number;
  sessionsAdaptive: number;
  sessionsBaseline: number;
  adaptiveEnabled: boolean | number | null;
  interventionLevel: boolean | number | null;
  totalTasks: number;
  doneTasks: number;
  vorschlaegeGesamt: number;
  vorschlaegeOffen: number;
  vorschlaegeAngenommen: number;
  vorschlaegeAbgelehnt: number;
  vorschlaegeSpaeter: number;
  viewChangedCount: number;
  whyClickedCount: number;
};

export type SessionExportRow = {
  userPseudonym: string;
  inferredRole: DemoRoleKey;
  sessionId: string;
  sessionCode: string;
  variant: StudyVariant | null;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
};

export type VorschlagExportRow = {
  userPseudonym: string;
  inferredRole: DemoRoleKey;
  sessionCode: string | null;
  sessionVariant: StudyVariant | null;
  suggestionId: string;
  ruleKey: string;
  suggestionType: string;
  titel: string;
  /** pending | accepted | rejected | snoozed | undone */
  status: string;
  /** Lesbar: Offen | Angenommen | Abgelehnt | Später | Rückgängig */
  statusLabel: string;
  erstelltAm: string;
  reagiertAm: string | null;
  /** Bestätigung aus Interaktionslog (falls vorhanden) */
  interaktionTyp: string | null;
  interaktionAm: string | null;
};

export type InteraktionExportRow = {
  userPseudonym: string;
  inferredRole: DemoRoleKey;
  sessionCode: string | null;
  sessionVariant: StudyVariant | null;
  interactionId: string;
  typ: string;
  zeitpunkt: string;
  taskId: string | null;
  suggestionId: string | null;
  ruleKey: string | null;
  taskTitle: string | null;
  navFrom: string | null;
  navTo: string | null;
};

export type AdminDerivedExportTables = {
  teilnehmer: TeilnehmerExportRow[];
  sessions: SessionExportRow[];
  vorschlaege: VorschlagExportRow[];
  vorschlagReaktionen: InteraktionExportRow[];
  interaktionen: InteraktionExportRow[];
};

function statusLabelDe(status: string): string {
  switch (status) {
    case "accepted":
      return "Angenommen";
    case "rejected":
      return "Abgelehnt";
    case "snoozed":
      return "Später";
    case "undone":
      return "Rückgängig";
    case "pending":
      return "Offen";
    default:
      return status;
  }
}

function reactionBySuggestionId(payloads: UserExportPayload[]) {
  const map = new Map<
    string,
    { type: string; at: string }
  >();
  for (const p of payloads) {
    const pseudonym = p.user?.pseudonym ?? "";
    for (const i of p.interactions) {
      if (!SUGGESTION_REACTION_TYPES.has(i.type)) continue;
      const meta = flattenMetadata(i.metadata);
      const sid = typeof meta.suggestionId === "string" ? meta.suggestionId : null;
      if (!sid) continue;
      const at = i.createdAt.toISOString();
      const prev = map.get(sid);
      if (!prev || at > prev.at) {
        map.set(sid, { type: i.type, at });
      }
    }
    void pseudonym;
  }
  return map;
}

export function buildAdminDerivedExportTables(payloads: UserExportPayload[]): AdminDerivedExportTables {
  const reactions = reactionBySuggestionId(payloads);

  const teilnehmer: TeilnehmerExportRow[] = [];
  const sessions: SessionExportRow[] = [];
  const vorschlaege: VorschlagExportRow[] = [];
  const vorschlagReaktionen: InteraktionExportRow[] = [];
  const interaktionen: InteraktionExportRow[] = [];

  for (const p of payloads) {
    const pseudonym = p.user?.pseudonym ?? "—";
    const role = p.summary.inferredRole;
    const sessionById = new Map(p.sessions.map((s) => [s.id, s]));

    const sugCounts = { pending: 0, accepted: 0, rejected: 0, snoozed: 0, undone: 0 };
    for (const s of p.suggestions) {
      const key = s.status as keyof typeof sugCounts;
      if (key in sugCounts) sugCounts[key]++;
    }

    teilnehmer.push({
      userPseudonym: pseudonym,
      inferredRole: role,
      sessionCount: p.summary.sessionCount,
      sessionsAdaptive: p.summary.sessionsAdaptive,
      sessionsBaseline: p.summary.sessionsBaseline,
      adaptiveEnabled: p.summary.adaptiveEnabled,
      interventionLevel: p.summary.interventionLevel,
      totalTasks: p.summary.totalTasks,
      doneTasks: p.summary.doneTasks,
      vorschlaegeGesamt: p.suggestions.length,
      vorschlaegeOffen: sugCounts.pending,
      vorschlaegeAngenommen: sugCounts.accepted,
      vorschlaegeAbgelehnt: sugCounts.rejected,
      vorschlaegeSpaeter: sugCounts.snoozed,
      viewChangedCount: p.summary.viewChangedCount,
      whyClickedCount: p.summary.whyClickedCount,
    });

    for (const s of p.sessions) {
      sessions.push({
        userPseudonym: pseudonym,
        inferredRole: role,
        sessionId: s.id,
        sessionCode: s.sessionCode,
        variant: s.variant,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt ? s.endedAt.toISOString() : null,
        notes: s.notes,
      });
    }

    for (const sug of p.suggestions) {
      const sess = sug.studySessionId ? sessionById.get(sug.studySessionId) : null;
      const reaction = reactions.get(sug.id);
      vorschlaege.push({
        userPseudonym: pseudonym,
        inferredRole: role,
        sessionCode: sess?.sessionCode ?? null,
        sessionVariant: sess?.variant ?? null,
        suggestionId: sug.id,
        ruleKey: sug.ruleKey,
        suggestionType: sug.type,
        titel: sug.title,
        status: sug.status,
        statusLabel: statusLabelDe(sug.status),
        erstelltAm: sug.createdAt.toISOString(),
        reagiertAm: sug.respondedAt ? sug.respondedAt.toISOString() : null,
        interaktionTyp: reaction?.type ?? null,
        interaktionAm: reaction?.at ?? null,
      });
    }

    for (const i of p.interactions) {
      const sess = i.studySessionId ? sessionById.get(i.studySessionId) : null;
      const meta = flattenMetadata(i.metadata);
      const row: InteraktionExportRow = {
        userPseudonym: pseudonym,
        inferredRole: role,
        sessionCode: sess?.sessionCode ?? null,
        sessionVariant: sess?.variant ?? null,
        interactionId: i.id,
        typ: i.type,
        zeitpunkt: i.createdAt.toISOString(),
        taskId: i.taskId,
        suggestionId: typeof meta.suggestionId === "string" ? meta.suggestionId : null,
        ruleKey: typeof meta.ruleKey === "string" ? meta.ruleKey : null,
        taskTitle: typeof meta.taskTitle === "string" ? meta.taskTitle : null,
        navFrom: typeof meta.navFrom === "string" ? meta.navFrom : null,
        navTo: typeof meta.navTo === "string" ? meta.navTo : null,
      };
      interaktionen.push(row);
      if (SUGGESTION_REACTION_TYPES.has(i.type)) {
        vorschlagReaktionen.push(row);
      }
    }
  }

  const sortByUserThenTime = <T extends { userPseudonym: string }>(
    rows: T[],
    timeOf: (r: T) => string,
  ) => {
    rows.sort((a, b) => {
      const u = a.userPseudonym.localeCompare(b.userPseudonym);
      if (u !== 0) return u;
      return timeOf(a).localeCompare(timeOf(b));
    });
  };

  teilnehmer.sort((a, b) => a.userPseudonym.localeCompare(b.userPseudonym));
  sessions.sort((a, b) => a.userPseudonym.localeCompare(b.userPseudonym) || a.startedAt.localeCompare(b.startedAt));
  sortByUserThenTime(vorschlaege, (r) => r.erstelltAm);
  sortByUserThenTime(interaktionen, (r) => r.zeitpunkt);
  sortByUserThenTime(vorschlagReaktionen, (r) => r.zeitpunkt);

  return { teilnehmer, sessions, vorschlaege, vorschlagReaktionen, interaktionen };
}

export const ADMIN_EXPORT_README_DE = `FluxPlan Studien-Export (Admin). Tabellen:
- teilnehmer: eine Zeile pro Pseudonym mit Kennzahlen und Vorschlagszählern
- vorschlaege: jede adaptive Empfehlung mit status/statusLabel (Angenommen/Abgelehnt/…)
- vorschlagReaktionen: nur suggestion_* Interaktionen (Wer hat wann wie reagiert)
- interaktionen: vollständiges Interaktionsprotokoll, sortiert nach userPseudonym + Zeit
- sessions: alle Studien-Sessions pro User
- users: Rohdaten pro Person (optional für Detailanalyse)`;
