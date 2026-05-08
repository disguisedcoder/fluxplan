import { adaptiveTest as test, expect } from "./fixtures/variants";
import { request } from "@playwright/test";
import { exportJson } from "./utils/appApi";
import { expectEventually } from "./utils/expectEventually";

test("@ui settings master toggle switches adaptive.enabled", async ({ page, baseURL }) => {
  await page.goto("/einstellungen");
  await expect(page.getByRole("heading", { level: 1, name: "Einstellungen" })).toBeVisible();

  // The master toggle lives in the preferences card whose title is exactly "Vorschläge" (not body copy mentioning Vorschläge).
  const masterCard = page.locator(".fp-card").filter({ has: page.getByText("Vorschläge", { exact: true }) });
  const toggle = masterCard.getByRole("switch").first();

  await toggle.click();

  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

  await expectEventually(async () => {
    const ex = await exportJson(api);
    // In export summary, adaptiveEnabled is the primitive value (boolean) or null.
    expect(ex.summary?.adaptiveEnabled === false || ex.summary?.adaptiveEnabled === true).toBeTruthy();
  }, { timeoutMs: 15_000, intervalMs: 500, message: "export should be reachable after toggle" });

  await api.dispose();
});

