import { adaptiveTest as test, expect } from "./fixtures/variants";

test("@ui calendar renders and shows conflict badge (demo seed)", async ({ page }) => {
  await page.goto("/kalender");
  await expect(page.getByRole("heading", { level: 1, name: "Kalender" })).toBeVisible();

  // Evalrunner seed includes conflicting blocks; WeekPlanner header should show conflict count.
  await expect(page.getByText(/Konflikt/).first()).toBeVisible();
});

