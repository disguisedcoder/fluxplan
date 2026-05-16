import { prisma } from "@/lib/db/prisma";

import { roleFromPseudonym } from "./index";
import {
  ensureDefaultAdaptiveRules,
  seedRoleDemoContent,
  type DemoSeedReason,
} from "./seed-role-demo-content";

/** Entfernt Altlasten aus früherem Prisma-Seed (Aufgaben ohne `studySessionId`). */
export async function clearLegacyUserLevelDemoArtifacts(userId: string) {
  await prisma.$transaction([
    prisma.task.deleteMany({ where: { userId, studySessionId: null } }),
    prisma.taskInteraction.deleteMany({ where: { userId, studySessionId: null } }),
    prisma.adaptiveSuggestion.deleteMany({ where: { userId, studySessionId: null } }),
  ]);
}

/**
 * Rollen-Demo für F/T/E/P-Sessions — gleicher Pfad wie „Daten zurücksetzen“ und `POST /api/data/demo`.
 */
export async function seedDemoTestSessionOnStart(args: {
  userId: string;
  studySessionId: string;
  pseudonym: string;
  variant: "baseline" | "adaptive";
  seedReason?: Extract<DemoSeedReason, "session_start" | "session_data_reset">;
}) {
  await clearLegacyUserLevelDemoArtifacts(args.userId);
  await ensureDefaultAdaptiveRules();
  return seedRoleDemoContent({
    userId: args.userId,
    studySessionId: args.studySessionId,
    roleKey: roleFromPseudonym(args.pseudonym),
    isBaseline: args.variant === "baseline",
    seedReason: args.seedReason ?? "session_start",
  });
}
