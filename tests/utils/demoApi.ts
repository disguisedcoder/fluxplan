import type { APIRequestContext } from "@playwright/test";

export type StudyVariant = "baseline" | "adaptive";
export type DemoRole = "evalrunner" | "taskplanner" | "familienplanner";

export async function startStudySession(
  api: APIRequestContext,
  {
    pseudonym,
    variant,
    interventionLevel,
  }: { pseudonym: string; variant: StudyVariant; interventionLevel?: number },
) {
  const res = await api.post("/api/study/session", {
    data: { pseudonym, variant, interventionLevel },
  });
  if (!res.ok()) {
    throw new Error(
      `startStudySession failed: ${res.status()} ${await res.text()}\n` +
        `Hint: Stelle sicher, dass PostgreSQL läuft und DATABASE_URL erreichbar ist (z. B. \`docker compose up -d\`).`,
    );
  }
  return res.json() as Promise<unknown>;
}

export async function seedDemo(
  api: APIRequestContext,
  { role, resetFirst = true }: { role: DemoRole; resetFirst?: boolean },
) {
  const res = await api.post("/api/data/demo", { data: { role, resetFirst } });
  if (!res.ok()) {
    throw new Error(`seedDemo failed: ${res.status()} ${await res.text()}`);
  }
  return res.json() as Promise<{ createdTasks?: number; role?: string; baseline?: boolean }>;
}

