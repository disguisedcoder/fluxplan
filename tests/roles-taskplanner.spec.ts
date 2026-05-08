import { makeVariantFixture, expect } from "./fixtures/variants";

const test = makeVariantFixture("adaptive", "taskplanner");

test("@study taskplanner core features (tasks/search/sort/create)", async ({ page }) => {
  await page.goto("/aufgaben");
  await expect(page.getByRole("heading", { level: 1, name: "Aufgaben" })).toBeVisible();

  // Search field exists and works (basic UI feature).
  await page.getByPlaceholder("Aufgaben durchsuchen…").fill("Trigger");
  await expect(page.getByText(/Aufgaben sichtbar/i)).toBeVisible();

  // Sort dropdown works.
  await page.getByRole("button", { name: /Fällig|Sortierung/i }).click();
  await page.getByRole("option", { name: "A–Z" }).click();

  // Create flow entry exists.
  await page.getByRole("link", { name: "Neue Aufgabe" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Neue Aufgabe" })).toBeVisible();
});

