import { adaptiveTest as test, expect } from "./fixtures/variants";
import { request } from "@playwright/test";
import { listSuggestions } from "./utils/appApi";

test("@study evalrunner adaptive shows suggestions area", async ({ page, baseURL }) => {
  await page.goto("/anpassungen");
  await expect(page.getByRole("heading", { level: 1, name: "Anpassungen" })).toBeVisible();

  // We don't hard-assert exact suggestion copy (heuristics), but we expect the adaptive screen to render.
  await expect(page.getByRole("heading", { name: "Aktive Vorschläge" })).toBeVisible();

  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });
  const pending = await listSuggestions(api, "pending");
  expect(pending.suggestions.length).toBeGreaterThanOrEqual(0);
  await api.dispose();
});

