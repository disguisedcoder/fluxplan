import { adaptiveTest as test, expect } from "./fixtures/variants";
import { request } from "@playwright/test";
import { createTask, listTasks, patchTask } from "./utils/appApi";
import { expectEventually } from "./utils/expectEventually";

test("@ui tasks search + complete + reopen + delete", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

  const title = `PW_UI_TASK_${Date.now()}`;
  const due = new Date();
  due.setDate(due.getDate() + 1);
  due.setHours(14, 0, 0, 0);
  const created = await createTask(api, { title, priority: "medium", dueDate: due.toISOString() });

  await page.goto("/aufgaben");
  await page
    .waitForResponse(
      (r) => {
        const s = r.status();
        return (
          r.url().includes("/api/tasks") &&
          r.request().method() === "GET" &&
          s >= 200 &&
          s < 400
        );
      },
      { timeout: 60_000 },
    )
    .catch(() => {});
  await expect(page.getByRole("heading", { level: 1, name: "Aufgaben" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Lade Aufgaben…")).not.toBeVisible({ timeout: 30_000 });

  const q = page.getByPlaceholder("Aufgaben durchsuchen…");
  await q.click();
  await q.fill("");
  const searchWait = page.waitForResponse(
    (r) => r.url().includes("/api/tasks") && r.url().includes("q=") && r.ok(),
    { timeout: 30_000 },
  );
  await q.fill(title);
  await searchWait;
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible({ timeout: 30_000 });

  // Complete via checkbox (compact row aria-label is stable)
  await page.getByLabel(`Aufgabe ${title} erledigen`).click();

  // Verify via API that task is done (eventual consistency)
  await expectEventually(async () => {
    const done = await listTasks(api, { status: "done", q: title });
    expect(done.tasks.length).toBeGreaterThanOrEqual(1);
  }, { timeoutMs: 15_000, intervalMs: 500, message: "task should become done" });

  // Reopen via API (less flaky than hunting the collapsed 'recent done' UI)
  await patchTask(api, created.task.id, { status: "open" });

  await expectEventually(async () => {
    const open = await listTasks(api, { status: "open", q: title });
    expect(open.tasks.length).toBeGreaterThanOrEqual(1);
  }, { timeoutMs: 15_000, intervalMs: 500, message: "task should reopen" });

  // Reopen happens outside the page; TasksScreen only refetches when `queryString` changes.
  await page.reload();
  await page
    .waitForResponse(
      (r) => {
        const s = r.status();
        return (
          r.url().includes("/api/tasks") &&
          r.request().method() === "GET" &&
          s >= 200 &&
          s < 400
        );
      },
      { timeout: 60_000 },
    )
    .catch(() => {});
  await expect(page.getByRole("heading", { level: 1, name: "Aufgaben" })).toBeVisible();
  await expect(page.getByText("Lade Aufgaben…")).not.toBeVisible({ timeout: 30_000 });
  const q2 = page.getByPlaceholder("Aufgaben durchsuchen…");
  await q2.click();
  await q2.fill("");
  const searchWait2 = page.waitForResponse(
    (r) => r.url().includes("/api/tasks") && r.url().includes("q=") && r.ok(),
    { timeout: 30_000 },
  );
  await q2.fill(title);
  await searchWait2;
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible({ timeout: 30_000 });

  // Delete via UI: in-app confirmation dialog (CRUD); pin CompactTaskRow by test id.
  const taskRow = page
    .getByTestId("fp-compact-task-row")
    .filter({ has: page.getByLabel(`Aufgabe ${title} erledigen`, { exact: true }) });
  await taskRow.locator("[data-fp-delete-trigger]").click();
  await expect(page.getByTestId("fp-task-delete-dialog")).toBeVisible();
  await page.getByRole("button", { name: "Endgültig löschen" }).click();

  await expectEventually(async () => {
    const open = await listTasks(api, { status: "open", q: title });
    expect(open.tasks.length).toBe(0);
  }, { timeoutMs: 15_000, intervalMs: 500, message: "task should be deleted" });

  await api.dispose();
});

