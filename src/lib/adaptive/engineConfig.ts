import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

const DEFAULT_LEVEL = 2;

export type EngineConfig = {
  adaptiveEnabled: boolean;
  interventionLevel: 0 | 1 | 2 | 3;
  cooldownByRuleKey: Record<string, Date>;
  snoozeByRuleKey: Record<string, Date>;
};

export async function loadEngineConfig(userId: string): Promise<EngineConfig> {
  const prefs = await prisma.userPreference.findMany({ where: { userId } });

  let adaptiveEnabled = true;
  let interventionLevel = DEFAULT_LEVEL;
  const cooldownByRuleKey: Record<string, Date> = {};

  for (const p of prefs) {
    if (p.key === "adaptive.enabled") {
      const v = readBool(p.value);
      if (v !== null) adaptiveEnabled = v;
    } else if (p.key === "adaptive.interventionLevel") {
      const v = readNumber(p.value);
      if (v !== null) interventionLevel = clampLevel(v);
    } else if (p.key.startsWith("rule.cooldown.")) {
      const ruleKey = p.key.replace("rule.cooldown.", "");
      const until = readUntil(p.value);
      if (until && until.getTime() > Date.now()) cooldownByRuleKey[ruleKey] = until;
    }
  }

  // Snooze: if a suggestion was snoozed within last 24h, treat that rule as paused for 24h.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const snoozed = await prisma.adaptiveSuggestion.findMany({
    where: { userId, status: "snoozed", respondedAt: { gte: dayAgo } },
    select: { ruleKey: true, respondedAt: true },
    orderBy: { respondedAt: "desc" },
  });
  const snoozeByRuleKey: Record<string, Date> = {};
  for (const s of snoozed) {
    if (!s.respondedAt) continue;
    const until = new Date(s.respondedAt.getTime() + 24 * 60 * 60 * 1000);
    if (!snoozeByRuleKey[s.ruleKey] || snoozeByRuleKey[s.ruleKey] < until) {
      snoozeByRuleKey[s.ruleKey] = until;
    }
  }

  return {
    adaptiveEnabled,
    interventionLevel: interventionLevel as EngineConfig["interventionLevel"],
    cooldownByRuleKey,
    snoozeByRuleKey,
  };
}

export function isRulePaused(config: EngineConfig, ruleKey: string): boolean {
  if (!config.adaptiveEnabled) return true;
  if (config.interventionLevel === 0) return true;
  const cooldown = config.cooldownByRuleKey[ruleKey];
  if (cooldown && cooldown.getTime() > Date.now()) return true;
  const snooze = config.snoozeByRuleKey[ruleKey];
  if (snooze && snooze.getTime() > Date.now()) return true;
  return false;
}

// Higher level = more eagerly triggered. We translate into a divisor on minimal sample size.
export function thresholdMultiplier(config: EngineConfig): number {
  switch (config.interventionLevel) {
    case 0:
      return Number.POSITIVE_INFINITY; // disables
    case 1:
      return 1.5; // higher threshold (less eager)
    case 2:
      return 1.0;
    case 3:
      return 0.7; // lower threshold (more eager)
    default:
      return 1.0;
  }
}

export async function maybeApplyCooldownAfterReject(
  userId: string,
  ruleKey: string,
): Promise<{ until: Date } | null> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recentRejects = await prisma.adaptiveSuggestion.count({
    where: {
      userId,
      ruleKey,
      status: "rejected",
      respondedAt: { gte: since },
    },
  });

  if (recentRejects < 2) return null;

  const until = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const value = { until: until.toISOString() };
  await prisma.userPreference.upsert({
    where: { userId_key: { userId, key: `rule.cooldown.${ruleKey}` } },
    update: { value: value as Prisma.InputJsonValue },
    create: { userId, key: `rule.cooldown.${ruleKey}`, value: value as Prisma.InputJsonValue },
  });
  return { until };
}

function readBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "object" && v !== null && "value" in v) {
    const inner = (v as { value?: unknown }).value;
    if (typeof inner === "boolean") return inner;
  }
  return null;
}

function readNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "object" && v !== null && "value" in v) {
    const inner = (v as { value?: unknown }).value;
    if (typeof inner === "number") return inner;
  }
  return null;
}

function readUntil(v: unknown): Date | null {
  if (typeof v === "string") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "object" && v !== null && "until" in v) {
    const u = (v as { until?: unknown }).until;
    if (typeof u === "string") {
      const d = new Date(u);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

function clampLevel(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_LEVEL;
  if (n < 0) return 0;
  if (n > 3) return 3;
  return Math.round(n);
}
