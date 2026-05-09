import { makeVariantFixture, expect } from "./fixtures/variants";

const test = makeVariantFixture("adaptive", "taskplanner");

test("@study taskplanner core features (tasks/search/sort/create)", async ({ page }) => {
  await page.goto("/aufgaben");
  await expect(page.getByRole("heading", { level: 1, name: "Aufgaben" })).toBeVisible();

  // Search field exists and works (basic UI feature).
  await page.getByPlaceholder("Aufgaben durchsuchen…").fill("Trigger");
  await expect(page.getByText(/Aufgaben sichtbar/i)).toBeVisible();

  // Sort dropdown: Base UI Select — use portal content + text (role "option" varies by a11y tree).
  await page.getByRole("combobox").filter({ hasText: /Fällig|Sortierung|Priorität|Neu zuerst/ }).first().click();
  await expect(page.locator('[data-slot="select-content"]')).toBeVisible();
  await page.locator('[data-slot="select-content"]').getByText("A–Z", { exact: true }).click();

  // Create flow entry exists.
  await page.getByRole("link", { name: "Neue Aufgabe" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Neue Aufgabe" })).toBeVisible();
});

