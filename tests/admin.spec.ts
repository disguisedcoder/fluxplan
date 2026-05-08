import { test, expect, request } from "@playwright/test";
import { startStudySession } from "./utils/demoApi";

test("@admin reset-demo-users forbidden for non-admin", async ({ baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL });
  try {
    await startStudySession(api, { pseudonym: "F01", variant: "adaptive", interventionLevel: 2 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("db_unavailable") || msg.includes("DATABASE_URL")) test.skip("DB not available");
    throw e;
  }
  const res = await api.post("/api/data/reset-demo-users", {
    data: { confirm: "RESET_DEMO_USERS" },
  });
  expect(res.status()).toBe(403);
  await api.dispose();
});

test("@admin reset-demo-users allowed for admin pseudonym", async ({ baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL });
  try {
    await startStudySession(api, { pseudonym: "admin", variant: "adaptive", interventionLevel: 2 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("db_unavailable") || msg.includes("DATABASE_URL")) test.skip("DB not available");
    throw e;
  }
  const res = await api.post("/api/data/reset-demo-users", {
    data: { confirm: "RESET_DEMO_USERS" },
  });
  expect(res.ok()).toBeTruthy();
  await api.dispose();
});

