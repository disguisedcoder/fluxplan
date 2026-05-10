import { adaptiveTest as test, expect } from "./fixtures/variants";
import { request } from "@playwright/test";
import { evaluateAdaptive, listSuggestions, respondSuggestion } from "./utils/appApi";
import { expectEventuallyToBeTruthy } from "./utils/expectEventually";

test("@adaptive suggestion lifecycle (snooze -> re-trigger -> accept -> undo)", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

  // Ensure engine has a chance to create suggestions for the current state.
  await evaluateAdaptive(api, "/heute");

  const first = await expectEventuallyToBeTruthy(async () => {
    const pending = await listSuggestions(api, "pending");
    return pending.suggestions[0] ?? null;
  }, { timeoutMs: 30_000, intervalMs: 1_000, message: "waiting for pending suggestion" });

  // Snooze -> should mark suggestion as snoozed.
  const snoozed = await respondSuggestion(api, first.id, "snooze");
  expect(snoozed.suggestion.status).toBe("snoozed");

  // After snooze window elapsed (accelerated in tests), re-trigger evaluation until we get a new pending suggestion.
  const after = await expectEventuallyToBeTruthy(async () => {
    await evaluateAdaptive(api, "/heute");
    const pending = await listSuggestions(api, "pending");
    return pending.suggestions.find((s) => s.ruleKey === first.ruleKey) ?? pending.suggestions[0] ?? null;
  }, { timeoutMs: 90_000, intervalMs: 2_000, message: "waiting for re-trigger after snooze" });

  const accepted = await respondSuggestion(api, after.id, "accept");
  expect(accepted.suggestion.status).toBe("accepted");

  const undone = await respondSuggestion(api, after.id, "undo");
  expect(undone.suggestion.status).toBe("pending");

  await api.dispose();
});

test("@adaptive snoozed suggestion can be reopened with undo (pending again)", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });
  try {
    await evaluateAdaptive(api, "/heute");
    const first = await expectEventuallyToBeTruthy(async () => {
      const pending = await listSuggestions(api, "pending");
      return pending.suggestions[0] ?? null;
    }, { timeoutMs: 30_000, intervalMs: 1_000, message: "waiting for pending suggestion" });

    const snoozed = await respondSuggestion(api, first.id, "snooze");
    expect(snoozed.suggestion.status).toBe("snoozed");

    const reopened = await respondSuggestion(api, first.id, "undo");
    expect(reopened.suggestion.status).toBe("pending");
  } finally {
    await api.dispose();
  }
});

