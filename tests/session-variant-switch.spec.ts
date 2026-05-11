import { expect, request, test } from "@playwright/test";

import { createTask, listTasks, resetUserData } from "./utils/appApi";
import { startStudySession } from "./utils/demoApi";

test("@study switching baseline to adaptive keeps created tasks visible", async ({ browser, baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");

  const api = await request.newContext({ baseURL });
  const title = `PW_VARIANT_KEEP_${Date.now()}`;
  const due = new Date();
  due.setDate(due.getDate() + 1);
  due.setHours(10, 30, 0, 0);

  try {
    await startStudySession(api, { pseudonym: "G01", variant: "baseline" });
    await resetUserData(api);
    await createTask(api, { title, priority: "medium", dueDate: due.toISOString() });

    const switchRes = await api.patch("/api/study/session", {
      data: { variant: "adaptive", interventionLevel: 2 },
    });
    expect(switchRes.ok()).toBeTruthy();

    await expect
      .poll(
        async () => {
          const open = await listTasks(api, { status: "open", q: title });
          return open.tasks.length;
        },
        { timeout: 15_000 },
      )
      .toBe(1);

    const context = await browser.newContext({ storageState: await api.storageState() });
    try {
      const page = await context.newPage();

      await page.goto("/aufgaben", { waitUntil: "domcontentloaded" });
      await page
        .waitForResponse((r) => r.url().includes("/api/tasks") && r.request().method() === "GET" && r.ok(), {
          timeout: 60_000,
        })
        .catch(() => {});
      await expect(page.getByRole("heading", { level: 1, name: "Aufgaben" })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("Lade Aufgaben…")).not.toBeVisible({ timeout: 30_000 });
      await page.getByPlaceholder("Aufgaben durchsuchen…").fill(title);
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible({ timeout: 30_000 });

      await page.goto("/kalender", { waitUntil: "domcontentloaded" });
      await page
        .waitForResponse((r) => r.url().includes("/api/tasks") && r.request().method() === "GET" && r.ok(), {
          timeout: 60_000,
        })
        .catch(() => {});
      await expect(page.getByRole("heading", { level: 1, name: "Kalender" })).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("Lade Termine …")).not.toBeVisible({ timeout: 60_000 });
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    } finally {
      await context.close();
    }
  } finally {
    await api.dispose();
  }
});
