import { makeVariantFixture, expect } from "./fixtures/variants";

const test = makeVariantFixture("adaptive", "taskplanner");

test("@study taskplanner core features (tasks/search/sort/create)", async ({ page }) => {
  await page.goto("/aufgaben");
  await expect(page.getByRole("heading", { level: 1, name: "Aufgaben" })).toBeVisible();

  // Search field exists and works (basic UI feature).
  await page.getByPlaceholder("Aufgaben durchsuchen…").fill("Trigger");
  await expect(page.getByText(/Aufgaben sichtbar/i)).toBeVisible();

  // Sort: Trigger öffnet Portal; Item direkt ansprechen (data-slot="select-content" ist kurz unsichtbar während Animation).
  await page.getByTestId("fp-tasks-sort").click();
  await page
    .locator('[data-slot="select-item"]')
    .filter({ hasText: /^A–Z$/ })
    .click({ timeout: 20_000 });

  // Create flow entry exists.
  await page.getByRole("link", { name: "Neue Aufgabe" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Neue Aufgabe" })).toBeVisible();
});

