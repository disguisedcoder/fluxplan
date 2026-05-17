import { adaptiveTest as test, expect } from "./fixtures/variants";
import { request } from "@playwright/test";
import { evaluateAdaptive, exportJson, listSuggestions } from "./utils/appApi";
import { expectEventuallyToBeTruthy } from "./utils/expectEventually";

test("@ui anpassungen tabs render and detail selection logs why_clicked", async ({ page, baseURL }) => {
  await page.goto("/anpassungen");
  await expect(page.getByRole("heading", { level: 1, name: "Anpassungen" })).toBeVisible();
  const tablist = page.getByRole("tablist", { name: "Adaptions-Tabs" });
  await tablist.getByRole("tab", { name: "Personalisierung" }).click();
  await expect(tablist.getByRole("tab", { name: "Personalisierung" })).toHaveAttribute("aria-selected", "true");
  await tablist.getByRole("tab", { name: "Pausen" }).click();
  await expect(tablist.getByRole("tab", { name: "Pausen" })).toHaveAttribute("aria-selected", "true");
  await tablist.getByRole("tab", { name: "Anpassungen" }).click();
  await expect(tablist.getByRole("tab", { name: "Anpassungen" })).toHaveAttribute("aria-selected", "true");

  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

  await evaluateAdaptive(api, "/heute");
  const pendingSuggestion = await expectEventuallyToBeTruthy(
    async () => {
      const pending = await listSuggestions(api, "pending");
      return pending.suggestions[0] ?? null;
    },
    { timeoutMs: 30_000, intervalMs: 500, message: "at least one pending suggestion for detail panel" },
  );

  const before = await exportJson(api);
  const beforeWhy = Number(before.summary?.whyClickedCount ?? 0);

  await page.goto("/anpassungen?tab=adaptations", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Anpassungen" })).toBeVisible();
  const tablistAfterReload = page.getByRole("tablist", { name: "Adaptions-Tabs" });
  await expect(tablistAfterReload.getByRole("tab", { name: "Anpassungen" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  const pendingCard = page.locator(".fp-card").filter({ hasText: "Aktive Vorschläge" });
  await expect(pendingCard).toBeVisible({ timeout: 30_000 });
  await expect(pendingCard.getByText("Lade …")).toBeHidden({ timeout: 60_000 });
  await expect(pendingCard.getByRole("button", { name: pendingSuggestion.title })).toBeVisible({
    timeout: 30_000,
  });
  await pendingCard.getByRole("button", { name: pendingSuggestion.title }).click();

  const detail = page.getByTestId("fp-suggestion-detail");
  await expect(detail).toBeVisible({ timeout: 30_000 });
  await expect(detail.getByRole("heading", { level: 2, name: pendingSuggestion.title })).toBeVisible();
  await expect(detail.getByRole("heading", { name: "Warum sehe ich das?" })).toBeVisible();
  await expect(detail.getByRole("heading", { name: "Was passiert beim Annehmen?" })).toBeVisible();
  await expect(detail.getByRole("button", { name: "Später erinnern" })).toBeVisible();

  await expectEventuallyToBeTruthy(async () => {
    const after = await exportJson(api);
    const afterWhy = Number(after.summary?.whyClickedCount ?? 0);
    return afterWhy > beforeWhy ? afterWhy : null;
  }, { timeoutMs: 15_000, intervalMs: 500, message: "why_clicked should increase after opening detail" });

  await api.dispose();
});
