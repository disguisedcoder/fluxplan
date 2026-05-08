import { baselineTest as test, expect } from "./fixtures/variants";
import { request } from "@playwright/test";
import { exportJson, listSuggestions } from "./utils/appApi";

test("@study evalrunner baseline has no suggestions UI", async ({ page, baseURL }) => {
  await page.goto("/anpassungen");
  await expect(page.getByRole("heading", { level: 1, name: "Anpassungen" })).toBeVisible();
  await expect(page.getByText("Baseline-Modus")).toBeVisible();
  await expect(page.getByRole("link", { name: /Zum Studienwechsel/i })).toBeVisible();

  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

  const pending = await listSuggestions(api, "pending");
  expect(pending.suggestions.length).toBe(0);

  const ex = await exportJson(api);
  expect(ex.summary?.sessionVariant).toBe("baseline");
  expect(ex.summary?.adaptiveEnabled).toBe(false);

  await api.dispose();
});

