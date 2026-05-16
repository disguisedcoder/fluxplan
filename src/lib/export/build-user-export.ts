import type { StudyVariant } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  whereAdaptiveSuggestionsForActiveStudySession,
  whereTaskInteractionsForActiveStudySession,
  whereTasksForActiveStudySession,
} from "@/lib/data/session-content-delete";
import { roleFromPseudonym } from "@/lib/demo";
import type { DemoRoleKey } from "@/lib/demo/types";

import {
  ADMIN_EXPORT_README_DE,
  buildAdminDerivedExportTables,
  type AdminDerivedExportTables,
} from "./admin-export-tables";

export type UserExportScope = "active_session" | "all_user_data";

export type ExportSummary = {
  totalTasks: number;
  openTasks: number;
  doneTasks: number;
  createdTasks: number;
  completedTasks: number;
  reopenedTasks: number;
  deletedTasks: number;
  filterUsedCount: number;
  viewChangedCount: number;
  reminderAddedCount: number;
  suggestionSeenCount: number;
  whyClickedCount: number;
  suggestionsPending: number;
  suggestionsAccepted: number;
  suggestionsRejected: number;
  suggestionsSnoozed: number;
  suggestionsUndone: number;
  adaptiveEnabled: boolean | number | null;
  interventionLevel: boolean | number | null;
  sessionVariant: StudyVariant | null;
  sessionCount: number;
  sessionsAdaptive: number;
  sessionsBaseline: number;
  inferredRole: DemoRoleKey;
};

export type UserExportPayload = {
  exportedAt: string;
  scope: UserExportScope;
  user: {
    id: string;
    pseudonym: string;
    createdAt: Date;
    studyModeEnabled: boolean;
  } | null;
  session: {
    id: string;
    sessionCode: string;
    startedAt: Date;
    endedAt: Date | null;
    variant: StudyVariant | null;
  } | null;
  sessions: Array<{
    id: string;
    sessionCode: string;
    startedAt: Date;
    endedAt: Date | null;
    variant: StudyVariant | null;
    notes: string | null;
  }>;
  preferences: Record<string, unknown>;
  tasks: Awaited<ReturnType<typeof prisma.task.findMany>>;
  interactions: Awaited<ReturnType<typeof prisma.taskInteraction.findMany>>;
  suggestions: Awaited<ReturnType<typeof prisma.adaptiveSuggestion.findMany>>;
  eventLogs: Awaited<ReturnType<typeof prisma.eventLog.findMany>>;
  summary: ExportSummary;
};

function prefPrimitive(preferences: Record<string, unknown>, key: string): boolean | number | null {
  const v = preferences[key] as unknown;
  if (v == null) return null;
  if (typeof v === "boolean" || typeof v === "number") return v;
  if (typeof v === "object" && v !== null && "value" in (v as Record<string, unknown>)) {
    const inner = (v as Record<string, unknown>).value;
    if (typeof inner === "boolean" || typeof inner === "number") return inner;
  }
  return null;
}

function countsByType(xs: { type: string }[]) {
  return xs.reduce<Record<string, number>>((acc, x) => {
    acc[x.type] = (acc[x.type] ?? 0) + 1;
    return acc;
  }, {});
}

export function buildExportSummary(args: {
  pseudonym: string;
  tasks: { status: string }[];
  interactions: { type: string }[];
  suggestions: { status: string }[];
  eventLogs: { eventType: string }[];
  preferences: Record<string, unknown>;
  sessions: { variant: StudyVariant | null }[];
  activeSessionVariant: StudyVariant | null;
}): ExportSummary {
  const interactionCounts = countsByType(args.interactions);
  const eventCounts = countsByType(args.eventLogs.map((e) => ({ type: e.eventType })));

  const sessionsAdaptive = args.sessions.filter((s) => s.variant === "adaptive").length;
  const sessionsBaseline = args.sessions.filter((s) => s.variant === "baseline").length;

  return {
    totalTasks: args.tasks.length,
    openTasks: args.tasks.filter((t) => t.status !== "done" && t.status !== "archived").length,
    doneTasks: args.tasks.filter((t) => t.status === "done").length,
    createdTasks: interactionCounts["task_created"] ?? 0,
    completedTasks: interactionCounts["task_completed"] ?? 0,
    reopenedTasks: interactionCounts["task_undone"] ?? 0,
    deletedTasks: interactionCounts["task_deleted"] ?? 0,
    filterUsedCount: eventCounts["filter_used"] ?? 0,
    viewChangedCount: eventCounts["view_changed"] ?? 0,
    reminderAddedCount: eventCounts["reminder_added"] ?? 0,
    suggestionSeenCount: eventCounts["suggestion_seen"] ?? 0,
    whyClickedCount: eventCounts["why_clicked"] ?? 0,
    suggestionsPending: args.suggestions.filter((s) => s.status === "pending").length,
    suggestionsAccepted: interactionCounts["suggestion_accepted"] ?? 0,
    suggestionsRejected: interactionCounts["suggestion_rejected"] ?? 0,
    suggestionsSnoozed: interactionCounts["suggestion_snoozed"] ?? 0,
    suggestionsUndone: interactionCounts["suggestion_undone"] ?? 0,
    adaptiveEnabled: prefPrimitive(args.preferences, "adaptive.enabled"),
    interventionLevel: prefPrimitive(args.preferences, "adaptive.interventionLevel"),
    sessionVariant: args.activeSessionVariant,
    sessionCount: args.sessions.length,
    sessionsAdaptive,
    sessionsBaseline,
    inferredRole: roleFromPseudonym(args.pseudonym),
  };
}

export async function buildUserExportPayload(args: {
  userId: string;
  scope: UserExportScope;
  activeSessionId?: string | null;
  exportedAt?: string;
}): Promise<UserExportPayload> {
  const exportedAt = args.exportedAt ?? new Date().toISOString();
  const sessionId = args.scope === "active_session" ? (args.activeSessionId ?? null) : null;

  const taskScope =
    args.scope === "active_session"
      ? whereTasksForActiveStudySession(args.userId, sessionId)
      : { userId: args.userId };
  const interactionScope =
    args.scope === "active_session"
      ? whereTaskInteractionsForActiveStudySession(args.userId, sessionId)
      : { userId: args.userId };
  const suggestionScope =
    args.scope === "active_session"
      ? whereAdaptiveSuggestionsForActiveStudySession(args.userId, sessionId)
      : { userId: args.userId };

  const [user, activeSession, sessions, tasks, interactions, suggestions, eventLogs, preferenceRows] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: args.userId },
        select: { id: true, pseudonym: true, createdAt: true, studyModeEnabled: true },
      }),
      sessionId
        ? prisma.studySession.findFirst({
            where: { id: sessionId, userId: args.userId },
            select: { id: true, sessionCode: true, startedAt: true, endedAt: true, variant: true },
          })
        : Promise.resolve(null),
      prisma.studySession.findMany({
        where: { userId: args.userId },
        orderBy: { startedAt: "asc" },
        select: {
          id: true,
          sessionCode: true,
          startedAt: true,
          endedAt: true,
          variant: true,
          notes: true,
        },
      }),
      prisma.task.findMany({ where: taskScope, orderBy: { createdAt: "asc" } }),
      prisma.taskInteraction.findMany({ where: interactionScope, orderBy: { createdAt: "asc" } }),
      prisma.adaptiveSuggestion.findMany({ where: suggestionScope, orderBy: { createdAt: "asc" } }),
      prisma.eventLog.findMany({
        where: { userId: args.userId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.userPreference.findMany({ where: { userId: args.userId }, orderBy: { key: "asc" } }),
    ]);

  const preferences: Record<string, unknown> = {};
  for (const r of preferenceRows) preferences[r.key] = r.value;

  const summary = buildExportSummary({
    pseudonym: user?.pseudonym ?? "",
    tasks,
    interactions,
    suggestions,
    eventLogs,
    preferences,
    sessions,
    activeSessionVariant: activeSession?.variant ?? null,
  });

  return {
    exportedAt,
    scope: args.scope,
    user,
    session: activeSession,
    sessions,
    preferences,
    tasks,
    interactions,
    suggestions,
    eventLogs,
    summary,
  };
}

export function flattenMetadata(m: unknown): Record<string, unknown> {
  const meta = typeof m === "object" && m !== null ? (m as Record<string, unknown>) : null;
  const flat: Record<string, unknown> = {};
  if (!meta) return flat;
  if (typeof meta.taskTitle === "string") flat.taskTitle = meta.taskTitle;
  if (typeof meta.ruleKey === "string") flat.ruleKey = meta.ruleKey;
  if (typeof meta.action === "string") flat.action = meta.action;
  if (typeof meta.status === "string") flat.status = meta.status;
  if (typeof meta.suggestionId === "string") flat.suggestionId = meta.suggestionId;
  if (typeof meta.taskId === "string") flat.taskId = meta.taskId;
  if (typeof meta.from === "string") flat.navFrom = meta.from;
  if (typeof meta.to === "string") flat.navTo = meta.to;
  return flat;
}

export type FlatExportRow = Record<string, unknown>;

export function userExportToFlatRows(
  payload: UserExportPayload,
  bundleMeta?: { bundleExportedAt: string; exportKind: string },
): FlatExportRow[] {
  const sessionById = new Map(payload.sessions.map((s) => [s.id, s]));
  const baseRow: FlatExportRow = {
    ...(bundleMeta ?? {}),
    exportedAt: payload.exportedAt,
    exportScope: payload.scope,
    userId: payload.user?.id ?? null,
    userPseudonym: payload.user?.pseudonym ?? null,
    inferredRole: payload.summary.inferredRole,
    activeSessionId: payload.session?.id ?? null,
    activeSessionCode: payload.session?.sessionCode ?? null,
    activeSessionVariant: payload.session?.variant ?? null,
  };

  const rows: FlatExportRow[] = [
    ...payload.eventLogs.map((e) => {
      const s = e.sessionId ? sessionById.get(e.sessionId) : null;
      return {
        ...baseRow,
        recordType: "event",
        id: e.id,
        sessionId: e.sessionId,
        sessionCode: s?.sessionCode ?? null,
        sessionVariant: s?.variant ?? null,
        eventType: e.eventType,
        screen: e.screen,
        createdAt: e.createdAt.toISOString(),
        metadata: e.metadata,
        ...flattenMetadata(e.metadata),
      };
    }),
    ...payload.interactions.map((i) => {
      const s = i.studySessionId ? sessionById.get(i.studySessionId) : null;
      return {
        ...baseRow,
        recordType: "interaction",
        id: i.id,
        sessionId: i.studySessionId,
        sessionCode: s?.sessionCode ?? null,
        sessionVariant: s?.variant ?? null,
        taskId: i.taskId,
        type: i.type,
        createdAt: i.createdAt.toISOString(),
        metadata: i.metadata,
        ...flattenMetadata(i.metadata),
      };
    }),
    ...Object.entries(payload.preferences).map(([key, value]) => ({
      ...baseRow,
      recordType: "preference",
      key,
      value,
    })),
    ...payload.tasks.map((t) => {
      const s = t.studySessionId ? sessionById.get(t.studySessionId) : null;
      return {
        ...baseRow,
        recordType: "task",
        id: t.id,
        sessionId: t.studySessionId,
        sessionCode: s?.sessionCode ?? null,
        sessionVariant: s?.variant ?? null,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        reminderAt: t.reminderAt ? t.reminderAt.toISOString() : null,
        listName: t.listName,
        tags: t.tags,
        estimatedMinutes: t.estimatedMinutes,
        createdAt: t.createdAt.toISOString(),
        completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      };
    }),
    ...payload.suggestions.map((sug) => {
      const s = sug.studySessionId ? sessionById.get(sug.studySessionId) : null;
      return {
        ...baseRow,
        recordType: "suggestion",
        id: sug.id,
        sessionId: sug.studySessionId,
        sessionCode: s?.sessionCode ?? null,
        sessionVariant: s?.variant ?? null,
        ruleKey: sug.ruleKey,
        type: sug.type,
        status: sug.status,
        title: sug.title,
        explanation: sug.explanation,
        payload: sug.payload,
        createdAt: sug.createdAt.toISOString(),
        respondedAt: sug.respondedAt ? sug.respondedAt.toISOString() : null,
      };
    }),
    {
      ...baseRow,
      recordType: "summary",
      ...payload.summary,
    },
  ];

  return rows;
}

export type AdminAllUsersExport = {
  exportKind: "admin_all_participants";
  schemaVersion: 2;
  exportedAt: string;
  readme: string;
  participantCount: number;
  /** @deprecated Nutze `teilnehmer` — bleibt für Kompatibilität */
  participantsOverview: Array<{
    userId: string;
    pseudonym: string;
    inferredRole: DemoRoleKey;
    sessionCount: number;
    sessionsAdaptive: number;
    sessionsBaseline: number;
    summary: ExportSummary;
  }>;
  teilnehmer: AdminDerivedExportTables["teilnehmer"];
  sessions: AdminDerivedExportTables["sessions"];
  vorschlaege: AdminDerivedExportTables["vorschlaege"];
  vorschlagReaktionen: AdminDerivedExportTables["vorschlagReaktionen"];
  interaktionen: AdminDerivedExportTables["interaktionen"];
  users: UserExportPayload[];
};

export type AdminCsvSheet =
  | "teilnehmer"
  | "vorschlaege"
  | "vorschlag_reaktionen"
  | "interaktionen"
  | "sessions";

export async function buildAdminAllUsersExport(args: {
  excludeAdminPseudonyms?: boolean;
  exportedAt?: string;
}): Promise<AdminAllUsersExport> {
  const exportedAt = args.exportedAt ?? new Date().toISOString();
  const { getAdminPseudonyms } = await import("@/lib/admin/is-admin");
  const adminSet = new Set(getAdminPseudonyms());

  const users = await prisma.user.findMany({
    orderBy: { pseudonym: "asc" },
    select: { id: true, pseudonym: true },
  });

  const filtered = args.excludeAdminPseudonyms !== false
    ? users.filter((u) => !adminSet.has(u.pseudonym.trim().toUpperCase()))
    : users;

  const payloads: UserExportPayload[] = [];
  for (const u of filtered) {
    payloads.push(
      await buildUserExportPayload({
        userId: u.id,
        scope: "all_user_data",
        exportedAt,
      }),
    );
  }

  const participantsOverview = payloads
    .filter((p) => p.user)
    .map((p) => ({
      userId: p.user!.id,
      pseudonym: p.user!.pseudonym,
      inferredRole: p.summary.inferredRole,
      sessionCount: p.summary.sessionCount,
      sessionsAdaptive: p.summary.sessionsAdaptive,
      sessionsBaseline: p.summary.sessionsBaseline,
      summary: p.summary,
    }));

  const tables = buildAdminDerivedExportTables(payloads);

  return {
    exportKind: "admin_all_participants",
    schemaVersion: 2,
    exportedAt,
    readme: ADMIN_EXPORT_README_DE,
    participantCount: participantsOverview.length,
    participantsOverview,
    ...tables,
    users: payloads,
  };
}

export function adminExportCsvRows(
  bundle: AdminAllUsersExport,
  sheet: AdminCsvSheet,
): Record<string, unknown>[] {
  switch (sheet) {
    case "teilnehmer":
      return bundle.teilnehmer;
    case "vorschlaege":
      return bundle.vorschlaege;
    case "vorschlag_reaktionen":
      return bundle.vorschlagReaktionen;
    case "interaktionen":
      return bundle.interaktionen;
    case "sessions":
      return bundle.sessions;
    default:
      return bundle.vorschlaege;
  }
}

/** @deprecated Ein großes CSV — schwer lesbar; bevorzugt `adminExportCsvRows` mit `sheet`. */
export function adminAllUsersExportToFlatRows(bundle: AdminAllUsersExport): FlatExportRow[] {
  const bundleMeta = {
    exportKind: bundle.exportKind,
    bundleExportedAt: bundle.exportedAt,
    schemaVersion: bundle.schemaVersion,
  };

  const overviewRows: FlatExportRow[] = bundle.participantsOverview.map((p) => ({
    ...bundleMeta,
    recordType: "participant_overview",
    userId: p.userId,
    userPseudonym: p.pseudonym,
    ...p.summary,
  }));

  const detailRows = bundle.users.flatMap((u) => userExportToFlatRows(u, bundleMeta));
  return [...overviewRows, ...detailRows];
}
