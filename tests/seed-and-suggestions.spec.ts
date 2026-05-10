import { test, expect, request } from "@playwright/test";
import { seedDemo, startStudySession } from "./utils/demoApi";

/** Skip nur bei nicht erreichbarer PostgreSQL-Instanz. */

test("@api start session + seed demo works", async ({ baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL });

  try {
    await startStudySession(api, { pseudonym: "PW_API_SEED", variant: "adaptive", interventionLevel: 2 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("db_unavailable") || msg.includes("DATABASE_URL")) {
      test.skip(
        "DB nicht erreichbar (PostgreSQL/DATABASE_URL). Starte lokal z. B. `docker compose up -d --build` oder nutze Staging/CI.",
      );
    }
    throw e;
  }

  const seeded = await seedDemo(api, { role: "evalrunner", resetFirst: true });
  expect((seeded.createdTasks ?? 0) > 0).toBeTruthy();

  await api.dispose();
});

