import { adaptiveTest as test, expect } from "./fixtures/variants";
import { request } from "@playwright/test";
import { listTasks } from "./utils/appApi";
import { expectEventually } from "./utils/expectEventually";

test("@ui create task via natural language parser and verify tokens + creation", async ({ page, baseURL }) => {
  await page.goto("/erstellen");
  await expect(page.getByRole("heading", { level: 1, name: "Neue Aufgabe" })).toBeVisible();

  const title = `PW Parser ${Date.now()}`;
  const natural = page.getByLabel("Sprachfeld (optional)");
  await expect(natural).toBeVisible();
  await natural.fill(`${title} morgen 9 Uhr 60 min #recherche !hoch`);

  // Parser shows tokens as chips (`kind: value` — see task-parser ParsedToken.kind)
  await expect(page.getByText(/date:/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/time:/i)).toBeVisible({ timeout: 30_000 });

  // Title input should be filled
  await expect(page.getByLabel("Titel")).toHaveValue(title);

  await page.getByRole("button", { name: "Aufgabe anlegen" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Aufgaben" })).toBeVisible();

  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });
  await expectEventually(async () => {
    const open = await listTasks(api, { status: "open", q: title });
    expect(open.tasks.length).toBeGreaterThanOrEqual(1);
  }, { timeoutMs: 15_000, intervalMs: 500, message: "task created via UI should exist" });
  await api.dispose();
});

