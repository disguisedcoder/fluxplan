import type { PrismaClient } from "@prisma/client";

import { makeStudySessionCode } from "@/lib/study/make-session-code";

import { roleFromPseudonym } from "./index";
import { ensureDefaultAdaptiveRules, seedRoleDemoContent } from "./seed-role-demo-content";
import { DEMO_TEST_PSEUDONYMS } from "./test-pseudonyms";

/** @deprecated Parameter wird ignoriert — nutzt globales `prisma` wie `ensureDefaultAdaptiveRules`. */
export async function ensureAdaptiveRules(_prisma?: PrismaClient) {
  await ensureDefaultAdaptiveRules();
}

export async function seedDemoTestUsers(prisma: PrismaClient, now = new Date()) {
  void now;
  await ensureDefaultAdaptiveRules();

  for (const pseudonym of DEMO_TEST_PSEUDONYMS) {
    const user = await prisma.user.upsert({
      where: { pseudonym },
      update: {},
      create: { pseudonym, studyModeEnabled: true },
      select: { id: true, pseudonym: true },
    });

    await prisma.$transaction([
      prisma.eventLog.deleteMany({ where: { userId: user.id } }),
      prisma.studySession.deleteMany({ where: { userId: user.id } }),
      prisma.adaptiveSuggestion.deleteMany({ where: { userId: user.id } }),
      prisma.taskInteraction.deleteMany({ where: { userId: user.id } }),
      prisma.task.deleteMany({ where: { userId: user.id } }),
      prisma.userPreference.deleteMany({ where: { userId: user.id } }),
    ]);

    const roleKey = roleFromPseudonym(pseudonym);
    const session = await prisma.studySession.create({
      data: {
        userId: user.id,
        sessionCode: makeStudySessionCode(pseudonym),
        variant: "adaptive",
        notes: `Seed-Testuser (${roleKey})`,
      },
      select: { id: true },
    });

    try {
      await seedRoleDemoContent({
        userId: user.id,
        studySessionId: session.id,
        roleKey,
        isBaseline: false,
        seedReason: "prisma_seed",
      });
    } catch (err) {
      console.warn(`seedDemoTestUsers: seedRoleDemoContent failed for ${pseudonym}:`, err);
    }
  }
}
