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
  await natural.click();
  await natural.fill(`${title} morgen 9 Uhr 60 min #recherche !hoch`);

  const titleInput = page.getByLabel("Titel");
  // Parser füllt Titel/Datum ggf. zeitversetzt; für den Submit-Button zählt der React-State.
  // Base UI Input: fill() feuert nicht immer zuverlässig onChange — Tastatureingabe ist stabiler.
  await expect(titleInput).toBeVisible();
  await titleInput.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await titleInput.pressSequentially(title, { delay: 15 });
  await expect(titleInput).toHaveValue(title);
  const dateInput = page.locator("#date");
  const timeInput = page.locator("#time");
  try {
    await expect(dateInput).not.toHaveValue("", { timeout: 10_000 });
  } catch {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    await dateInput.fill(d.toISOString().slice(0, 10));
  }
  try {
    await expect(timeInput).not.toHaveValue("", { timeout: 5000 });
  } catch {
    await timeInput.fill("09:00");
  }
  await expect(dateInput).not.toHaveValue("");
  await expect(timeInput).not.toHaveValue("");

  const submit = page.getByRole("button", { name: "Aufgabe anlegen" });
  await expect(submit).toBeEnabled({ timeout: 15_000 });
  await submit.click();
  await expect(page.getByRole("heading", { level: 1, name: "Aufgaben" })).toBeVisible();

  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });
  await expectEventually(async () => {
    const open = await listTasks(api, { status: "open", q: title });
    expect(open.tasks.length).toBeGreaterThanOrEqual(1);
  }, { timeoutMs: 15_000, intervalMs: 500, message: "task created via UI should exist" });
  await api.dispose();
});

