import { test as base, expect, request } from "@playwright/test";
import { seedDemo, startStudySession, type DemoRole, type StudyVariant } from "../utils/demoApi";
import { resetUserData } from "../utils/appApi";

type VariantFixtures = {
  pseudonym: string;
  role: DemoRole;
};

function pseudonymForWorker(workerIndex: number) {
  const run = process.env.GITHUB_RUN_ID ?? "local";
  return `PW_${run}_${workerIndex}`;
}

export const adaptiveTest = base.extend<VariantFixtures>({
  pseudonym: [
    async ({}, use, testInfo) => {
      await use(pseudonymForWorker(testInfo.workerIndex));
    },
    { scope: "worker" },
  ],
  role: ["evalrunner", { scope: "test" }],
  context: async ({ browser, baseURL, pseudonym, role }, use, testInfo) => {
    if (!baseURL) throw new Error("baseURL is required");
    const api = await request.newContext({ baseURL });
    try {
      await startStudySession(api, { pseudonym, variant: "adaptive", interventionLevel: 2 });
      await resetUserData(api);
      await seedDemo(api, { role, resetFirst: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("db_unavailable") || msg.includes("DATABASE_URL")) {
        testInfo.skip(
          "DB nicht erreichbar (PostgreSQL/DATABASE_URL). Starte lokal z. B. `docker compose up -d --build` oder nutze Staging/CI.",
        );
      }
      throw e;
    }
    const storageState = await api.storageState();
    await api.dispose();
    const context = await browser.newContext({ storageState });
    await use(context);
    await context.close();
  },
});

export const baselineTest = base.extend<VariantFixtures>({
  pseudonym: [
    async ({}, use, testInfo) => {
      await use(pseudonymForWorker(testInfo.workerIndex));
    },
    { scope: "worker" },
  ],
  role: ["evalrunner", { scope: "test" }],
  context: async ({ browser, baseURL, pseudonym, role }, use, testInfo) => {
    if (!baseURL) throw new Error("baseURL is required");
    const api = await request.newContext({ baseURL });
    try {
      await startStudySession(api, { pseudonym, variant: "baseline" });
      await resetUserData(api);
      await seedDemo(api, { role, resetFirst: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("db_unavailable") || msg.includes("DATABASE_URL")) {
        testInfo.skip(
          "DB nicht erreichbar (PostgreSQL/DATABASE_URL). Starte lokal z. B. `docker compose up -d --build` oder nutze Staging/CI.",
        );
      }
      throw e;
    }
    const storageState = await api.storageState();
    await api.dispose();
    const context = await browser.newContext({ storageState });
    await use(context);
    await context.close();
  },
});

export { expect };

export function makeVariantFixture(variant: StudyVariant, role: DemoRole) {
  return base.extend<VariantFixtures>({
    pseudonym: [
      async ({}, use, testInfo) => {
        await use(pseudonymForWorker(testInfo.workerIndex));
      },
      { scope: "worker" },
    ],
    role: [role, { scope: "test" }],
    context: async ({ browser, baseURL, pseudonym }, use, testInfo) => {
      if (!baseURL) throw new Error("baseURL is required");
      const api = await request.newContext({ baseURL });
      try {
        await startStudySession(api, {
          pseudonym,
          variant,
          interventionLevel: variant === "adaptive" ? 2 : undefined,
        });
        await resetUserData(api);
        await seedDemo(api, { role, resetFirst: false });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("db_unavailable") || msg.includes("DATABASE_URL")) {
          testInfo.skip(
            "DB nicht erreichbar (PostgreSQL/DATABASE_URL). Starte lokal z. B. `docker compose up -d --build` oder nutze Staging/CI.",
          );
        }
        throw e;
      }
      const storageState = await api.storageState();
      await api.dispose();
      const context = await browser.newContext({ storageState });
      await use(context);
      await context.close();
    },
  });
}

