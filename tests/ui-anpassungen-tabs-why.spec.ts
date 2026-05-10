import { adaptiveTest as test, expect } from "./fixtures/variants";
import { request } from "@playwright/test";
import { evaluateAdaptive, exportJson, listSuggestions } from "./utils/appApi";
import { expectEventuallyToBeTruthy } from "./utils/expectEventually";

test("@ui anpassungen tabs render and 'Warum sehe ich das?' logs why_clicked", async ({ page, baseURL }) => {
  await page.goto("/anpassungen");
  await expect(page.getByRole("heading", { level: 1, name: "Anpassungen" })).toBeVisible();
  const tablist = page.getByRole("tablist", { name: "Adaptions-Tabs" });
  // Tabs exist (scoped: avoids any future duplicate tab roles elsewhere)
  await tablist.getByRole("tab", { name: "Personalisierung" }).click();
  await expect(tablist.getByRole("tab", { name: "Personalisierung" })).toHaveAttribute("aria-selected", "true");
  await tablist.getByRole("tab", { name: "Pausen" }).click();
  await expect(tablist.getByRole("tab", { name: "Pausen" })).toHaveAttribute("aria-selected", "true");
  await tablist.getByRole("tab", { name: "Anpassungen" }).click();

  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

  // Ensure there is at least one pending suggestion for a visible card.
  await evaluateAdaptive(api, "/heute");
  await expectEventuallyToBeTruthy(async () => {
    const pending = await listSuggestions(api, "pending");
    return pending.suggestions[0] ?? null;
  }, { timeoutMs: 30_000, intervalMs: 1_000, message: "pending suggestion needed for why_clicked" });

  // Liste/Vorschläge wurden vor Evaluate geladen — neu laden, damit die Karte im DOM ist.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Anpassungen" })).toBeVisible();
  const pendingCard = page.locator(".fp-card").filter({ hasText: "Aktive Vorschläge" });
  await expect(pendingCard.getByText("Lade …")).toBeHidden({ timeout: 60_000 });
  await expect(
    page.getByRole("button", { name: "Warum sehe ich das?" }).first(),
  ).toBeVisible({ timeout: 30_000 });

  const before = await exportJson(api);
  const beforeWhy = Number(before.summary?.whyClickedCount ?? 0);

  // Click explanation popover trigger
  await page.getByRole("button", { name: "Warum sehe ich das?" }).first().click();

  await expectEventuallyToBeTruthy(async () => {
    const after = await exportJson(api);
    const afterWhy = Number(after.summary?.whyClickedCount ?? 0);
    return afterWhy > beforeWhy ? afterWhy : null;
  }, { timeoutMs: 15_000, intervalMs: 500, message: "why_clicked should increase" });

  await api.dispose();
});

