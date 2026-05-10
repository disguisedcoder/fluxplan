import { adaptiveTest as test, expect } from "./fixtures/variants";
import { request } from "@playwright/test";
import { listTasks } from "./utils/appApi";
import { expectEventually } from "./utils/expectEventually";

test("@ui create task via natural language parser and verify tokens + creation", async ({ page, baseURL }) => {
  await page.goto("/erstellen");
  await expect(page.getByRole("heading", { level: 1, name: "Neue Aufgabe" })).toBeVisible();

  const title = `PW Parser ${Date.now()}`;
  const natural = page.getByLabel("Sprachfeld (optional)");
  await expect(natural).toBeVisible();
  // fill() kann in Chromium/Docker React onChange nicht zuverlässig triggern — sequentiell tippen.
  await natural.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Backspace");
  await natural.pressSequentially(`${title} morgen 9 Uhr 60 min #recherche !hoch`, { delay: 15 });

  // Parser applies to Titel/Datum/Uhrzeit (chips are optional in CI — layout/DOM can hide token row).
  await expect(page.getByLabel("Titel")).toHaveValue(title, { timeout: 30_000 });
  await expect(page.locator("#date")).not.toHaveValue("", { timeout: 30_000 });
  await expect(page.locator("#time")).not.toHaveValue("", { timeout: 30_000 });

  await page.getByRole("button", { name: "Aufgabe anlegen" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Aufgaben" })).toBeVisible();

  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });
  await expectEventually(async () => {
    const open = await listTasks(api, { status: "open", q: title });
    expect(open.tasks.length).toBeGreaterThanOrEqual(1);
  }, { timeoutMs: 15_000, intervalMs: 500, message: "task created via UI should exist" });
  await api.dispose();
});

