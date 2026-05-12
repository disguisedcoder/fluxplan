import type { DemoRoleDefinition, DemoRoleKey } from "./types";
import { assertMinTasks } from "./types";
import { familienplannerRole } from "./roles/familienplanner";
import { taskplannerRole } from "./roles/taskplanner";
import { evalrunnerRole } from "./roles/evalrunner";

const PILOT_ROLE_BY_PSEUDONYM: Record<string, DemoRoleKey> = {
  P01: "familienplanner",
  P02: "taskplanner",
  P03: "evalrunner",
  P04: "familienplanner",
  P05: "taskplanner",
};

export function roleFromPseudonym(pseudonym: string): DemoRoleKey {
  const p = pseudonym.trim().toUpperCase();
  const pilotRole = PILOT_ROLE_BY_PSEUDONYM[p];
  if (pilotRole) return pilotRole;
  if (p.startsWith("F")) return "familienplanner";
  if (p.startsWith("T")) return "taskplanner";
  if (p.startsWith("E")) return "evalrunner";
  if (/^(G01|G02)$/i.test(p)) return "taskplanner"; // Gast-Workshop → einfache Demo-Rolle
  return "taskplanner";
}

export function getDemoRole(role: DemoRoleKey, now = new Date()): DemoRoleDefinition {
  const def =
    role === "familienplanner"
      ? familienplannerRole(now)
      : role === "evalrunner"
        ? evalrunnerRole(now)
        : taskplannerRole(now);
  assertMinTasks(def, 10);
  return def;
}

export { DEMO_TEST_PSEUDONYMS, isDemoTestPseudonym } from "./test-pseudonyms";
export type { DemoTestPseudonym } from "./test-pseudonyms";

