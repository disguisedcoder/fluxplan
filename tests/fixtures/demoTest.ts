import { test as base, expect, request } from "@playwright/test";
import { seedDemo, startStudySession } from "../utils/demoApi";

type DemoFixtures = {
  pseudonym: string;
};

export const test = base.extend<DemoFixtures>({
  pseudonym: [
    async ({}, use, testInfo) => {
      const worker = testInfo.workerIndex;
      const run = process.env.GITHUB_RUN_ID ?? "local";
      await use(`PW_${run}_${worker}`);
    },
    { scope: "worker" },
  ],

  context: async ({ browser, baseURL, pseudonym }, use, testInfo) => {
    if (!baseURL) throw new Error("baseURL is required for demo fixtures");

    const api = await request.newContext({ baseURL });
    try {
      await startStudySession(api, { pseudonym, variant: "adaptive", interventionLevel: 2 });
      await seedDemo(api, { role: "evalrunner", resetFirst: true });
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

