import { request } from "@playwright/test";

import { makeVariantFixture, expect } from "./fixtures/variants";
import { createTask, listTasks } from "./utils/appApi";

const test = makeVariantFixture("adaptive", "familienplanner");

test("@study @adaptive familienplanner calendar flow (week planner renders)", async ({ page }) => {
  await page.goto("/kalender");
  await expect(page.getByRole("heading", { level: 1, name: "Kalender" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Neue Aufgabe/i })).toBeVisible();
});

test("@study @adaptive familienplanner adaptive UI surfaces (heute, anpassungen, einstellungen)", async ({ page }) => {
  await page.goto("/heute");
  await expect(page.getByRole("heading", { level: 1, name: "Heute" })).toBeVisible();
  await expect(page.getByText(/Vorschlag verfügbar|Keine Vorschläge offen/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Modus: Adaptive")).toBeVisible({ timeout: 20_000 });
  if (await page.getByText("Keine Vorschläge offen").isVisible()) {
    // Kein pending → kein globales Banner mit Aktionen
  } else {
    await expect(
      page.getByRole("button", { name: "Nicht jetzt" }).or(page.getByRole("button", { name: "Annehmen" })).first(),
    ).toBeVisible({ timeout: 25_000 });
  }

  await page.goto("/anpassungen");
  await expect(page.getByRole("heading", { level: 1, name: "Anpassungen" })).toBeVisible();
  const tablist = page.getByRole("tablist", { name: "Adaptions-Tabs" });
  await expect(tablist.getByRole("tab", { name: "Anpassungen" })).toBeVisible();
  await expect(tablist.getByRole("tab", { name: "Personalisierung" })).toBeVisible();
  await expect(tablist.getByRole("tab", { name: "Pausen" })).toBeVisible();

  await page.goto("/einstellungen");
  await expect(page.getByRole("heading", { level: 1, name: "Einstellungen" })).toBeVisible();
  await expect(page.getByText("Aufgabe anlegen: Zusatzfelder")).toBeVisible();
  await expect(page.getByText("Vorschläge", { exact: true })).toBeVisible();
  await expect(page.getByText("Eingriffsstufe", { exact: true })).toBeVisible();
});

test("@study @adaptive familienplanner shows time overlap hint in week planner", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });
  // Mittwoch in derselben Montag-Woche wie „heute“, damit die Standard-Wochenansicht die Slots sicher trifft.
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  const dow = monday.getDay() || 7;
  monday.setDate(monday.getDate() - (dow - 1));
  const slot = new Date(monday);
  slot.setDate(slot.getDate() + 2);
  slot.setHours(19, 0, 0, 0);
  const due = slot.toISOString();
  const stamp = Date.now();
  await createTask(api, {
    title: `Overlap A ${stamp}`,
    dueDate: due,
    estimatedMinutes: 90,
    priority: "medium",
  });
  await createTask(api, {
    title: `Overlap B ${stamp}`,
    dueDate: due,
    estimatedMinutes: 30,
    priority: "medium",
  });
  await expect
    .poll(
      async () => {
        const r = await listTasks(api, { status: "open", q: String(stamp) });
        return r.tasks.length;
      },
      { timeout: 15_000 },
    )
    .toBe(2);
  await api.dispose();

  await page.goto("/kalender", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Kalender" })).toBeVisible({ timeout: 30_000 });
  await page
    .waitForResponse(
      (r) => r.url().includes("/api/tasks") && r.request().method() === "GET" && r.ok(),
      { timeout: 60_000 },
    )
    .catch(() => {});
  await expect(page.getByText("Lade Termine …")).not.toBeVisible({ timeout: 90_000 });
  await page.getByRole("button", { name: "Woche", exact: true }).click();
  await page.getByRole("button", { name: "Diese Woche" }).click();
  let found = false;
  for (let w = 0; w < 8; w += 1) {
    const conflictChip = page.getByText(/\d+\s+Konflikt(e)?/);
    const overlapInGrid = page.getByText(/überlappt/i);
    if ((await conflictChip.count()) > 0) {
      await expect(conflictChip.first()).toBeVisible();
      found = true;
      break;
    }
    if ((await overlapInGrid.count()) > 0) {
      await expect(overlapInGrid.first()).toBeVisible();
      found = true;
      break;
    }
    if (w < 7) await page.getByRole("button", { name: "Nächste Woche" }).click();
  }
  expect(found, "Zwei überlappende Termine sollten in der Kalenderwoche als Konflikt angezeigt werden").toBe(true);
});

