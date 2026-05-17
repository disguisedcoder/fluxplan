import { test, expect, request } from "@playwright/test";
import { startStudySession } from "./utils/demoApi";

/** Skip nur, wenn keine Study-DB erreichbar ist (siehe `fixtures/variants.ts`). */

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

test("@admin reset-guest-users forbidden for non-admin", async ({ baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL });
  try {
    await startStudySession(api, { pseudonym: "F01", variant: "adaptive", interventionLevel: 2 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("db_unavailable") || msg.includes("DATABASE_URL")) test.skip("DB not available");
    throw e;
  }
  const res = await api.post("/api/data/reset-guest-users", {
    data: { confirm: "RESET_GUEST_USERS" },
  });
  expect(res.status()).toBe(403);
  await api.dispose();
});

test("@admin export-all-users forbidden for non-admin", async ({ baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL });
  try {
    await startStudySession(api, { pseudonym: "F01", variant: "adaptive", interventionLevel: 2 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("db_unavailable") || msg.includes("DATABASE_URL")) test.skip("DB not available");
    throw e;
  }
  const res = await api.get("/api/data/export-all-users?format=json");
  expect(res.status()).toBe(403);
  await api.dispose();
});

test("@admin export-all-users returns participant bundle for admin", async ({ baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL });
  try {
    await startStudySession(api, { pseudonym: "admin", variant: "adaptive", interventionLevel: 2 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("db_unavailable") || msg.includes("DATABASE_URL")) test.skip("DB not available");
    throw e;
  }
  const res = await api.get("/api/data/export-all-users?format=json");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    exportKind?: string;
    schemaVersion?: number;
    participantCount?: number;
    teilnehmer?: unknown[];
    vorschlaege?: unknown[];
    interaktionen?: unknown[];
    users?: unknown[];
  };
  expect(body.exportKind).toBe("admin_all_participants");
  expect(body.schemaVersion).toBe(2);
  expect(typeof body.participantCount).toBe("number");
  expect(Array.isArray(body.teilnehmer)).toBeTruthy();
  expect(Array.isArray(body.vorschlaege)).toBeTruthy();
  expect(Array.isArray(body.interaktionen)).toBeTruthy();
  expect(Array.isArray(body.users)).toBeTruthy();
  await api.dispose();
});

test("@admin export-all-users auswertung json and xlsx for admin", async ({ baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL });
  try {
    await startStudySession(api, { pseudonym: "admin", variant: "adaptive", interventionLevel: 2 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("db_unavailable") || msg.includes("DATABASE_URL")) test.skip("DB not available");
    throw e;
  }

  const auswertung = await api.get("/api/data/export-all-users?format=json&profile=auswertung");
  expect(auswertung.ok()).toBeTruthy();
  const body = (await auswertung.json()) as {
    teilnehmer?: unknown[];
    vorschlaege?: unknown[];
    users?: unknown;
  };
  expect(Array.isArray(body.teilnehmer)).toBeTruthy();
  expect(Array.isArray(body.vorschlaege)).toBeTruthy();
  expect(body.users).toBeUndefined();

  const xlsx = await api.get("/api/data/export-all-users?format=xlsx");
  expect(xlsx.ok()).toBeTruthy();
  expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");

  await api.dispose();
});

test("@admin reset-guest-users allowed for admin pseudonym", async ({ baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL });
  try {
    await startStudySession(api, { pseudonym: "admin", variant: "adaptive", interventionLevel: 2 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("db_unavailable") || msg.includes("DATABASE_URL")) test.skip("DB not available");
    throw e;
  }
  const res = await api.post("/api/data/reset-guest-users", {
    data: { confirm: "RESET_GUEST_USERS" },
  });
  expect(res.ok()).toBeTruthy();
  await api.dispose();
});

