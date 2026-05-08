import { makeVariantFixture, expect } from "./fixtures/variants";

const test = makeVariantFixture("adaptive", "familienplanner");

test("@study familienplanner calendar flow (week planner renders)", async ({ page }) => {
  await page.goto("/kalender");
  await expect(page.getByRole("heading", { level: 1, name: "Kalender" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Neue Aufgabe/i })).toBeVisible();
});

