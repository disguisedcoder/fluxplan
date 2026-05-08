import { test, expect } from "./fixtures/demoTest";

test("@smoke app loads and core navigation works (demo seeded)", async ({ page }) => {
  await page.goto("/heute");
  await expect(page.getByRole("heading", { level: 1, name: "Heute" })).toBeVisible();

  await page.goto("/aufgaben");
  await expect(page.getByRole("heading", { level: 1, name: "Aufgaben" })).toBeVisible();

  await page.goto("/kalender");
  await expect(page.getByRole("heading", { level: 1, name: "Kalender" })).toBeVisible();

  await page.goto("/einstellungen");
  await expect(page.getByRole("heading", { level: 1, name: "Einstellungen" })).toBeVisible();

  await page.goto("/anpassungen");
  await expect(page.getByRole("heading", { level: 1, name: "Anpassungen" })).toBeVisible();
});

