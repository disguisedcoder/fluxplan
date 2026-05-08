import { adaptiveTest as test, expect } from "./fixtures/variants";
import { request } from "@playwright/test";
import {
  createTask,
  evaluateAdaptive,
  listSuggestions,
  respondSuggestion,
} from "./utils/appApi";
import { expectEventuallyToBeTruthy } from "./utils/expectEventually";

test("@adaptive rules daily_focus + view_preference are triggerable", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

  await evaluateAdaptive(api, "/heute");

  const focus = await expectEventuallyToBeTruthy(async () => {
    const pending = await listSuggestions(api, "pending");
    return pending.suggestions.find((s) => s.ruleKey === "daily_focus") ?? null;
  }, { timeoutMs: 30_000, intervalMs: 1_000, message: "daily_focus pending" });
  expect(focus.ruleKey).toBe("daily_focus");

  const viewPref = await expectEventuallyToBeTruthy(async () => {
    const pending = await listSuggestions(api, "pending");
    return pending.suggestions.find((s) => s.ruleKey === "view_preference") ?? null;
  }, { timeoutMs: 30_000, intervalMs: 1_000, message: "view_preference pending" });
  expect(viewPref.ruleKey).toBe("view_preference");

  await api.dispose();
});

test("@adaptive rule calendar_conflict triggers on task_created when day is overloaded", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

  // Create an additional long task on today; evalrunner seed already has heavy day load.
  const due = new Date();
  due.setHours(10, 0, 0, 0);
  await createTask(api, {
    title: `PW_CONFLICT_${Date.now()}`,
    dueDate: due.toISOString(),
    estimatedMinutes: 180,
    priority: "high",
  });

  const conflict = await expectEventuallyToBeTruthy(async () => {
    const pending = await listSuggestions(api, "pending");
    return pending.suggestions.find((s) => s.ruleKey === "calendar_conflict") ?? null;
  }, { timeoutMs: 30_000, intervalMs: 1_000, message: "calendar_conflict pending" });
  expect(conflict.ruleKey).toBe("calendar_conflict");

  await api.dispose();
});

test("@adaptive rule reminder_preference suggests reminder on similar tasks", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

  const due = new Date();
  due.setDate(due.getDate() + 1);
  due.setHours(12, 0, 0, 0);

  await createTask(api, {
    title: `PW_REM_PREF_${Date.now()}`,
    dueDate: due.toISOString(),
    listName: "Eval",
    priority: "medium",
  });

  const reminder = await expectEventuallyToBeTruthy(async () => {
    const pending = await listSuggestions(api, "pending");
    return pending.suggestions.find((s) => s.ruleKey === "reminder_preference") ?? null;
  }, { timeoutMs: 30_000, intervalMs: 1_000, message: "reminder_preference pending" });
  expect(reminder.ruleKey).toBe("reminder_preference");

  await api.dispose();
});

test("@adaptive rule adaptive_task_creation can be triggered with repeated task creation", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

  // Create several tasks with due+reminder to push usage ratios.
  const base = new Date();
  base.setDate(base.getDate() + 2);
  base.setHours(9, 0, 0, 0);

  for (let i = 0; i < 6; i += 1) {
    const due = new Date(base.getTime() + i * 60_000);
    const reminder = new Date(due.getTime() - 60 * 60 * 1000);
    await createTask(api, {
      title: `PW_FORM_${Date.now()}_${i}`,
      dueDate: due.toISOString(),
      reminderAt: reminder.toISOString(),
      priority: "medium",
    });
  }

  const chips = await expectEventuallyToBeTruthy(async () => {
    const pending = await listSuggestions(api, "pending");
    return pending.suggestions.find((s) => s.ruleKey === "adaptive_task_creation") ?? null;
  }, { timeoutMs: 30_000, intervalMs: 1_000, message: "adaptive_task_creation pending" });
  expect(chips.ruleKey).toBe("adaptive_task_creation");

  // Clean up: avoid piling up pending suggestions that could interfere with other tests.
  await respondSuggestion(api, chips.id, "snooze");

  await api.dispose();
});

