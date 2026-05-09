import { makeVariantFixture, expect } from "./fixtures/variants";

const test = makeVariantFixture("adaptive", "familienplanner");

test("@study @adaptive familienplanner calendar flow (week planner renders)", async ({ page }) => {
  await page.goto("/kalender");
  await expect(page.getByRole("heading", { level: 1, name: "Kalender" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Neue Aufgabe/i })).toBeVisible();
});

test("@study @adaptive familienplanner adaptive UI surfaces (heute, anpassungen, einstellungen)", async ({ page }) => {
  await page.goto("/heute");
  await expect(page.getByRole("heading", { level: 1, name: "Heute" })).toBeVisible();
  await expect(page.getByText(/Vorschlag verfügbar|Keine Vorschläge offen/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Modus: Adaptive")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Vorschlag verfügbar|Keine Vorschläge offen/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Nicht jetzt" }).or(page.getByRole("button", { name: "Annehmen" })).first(),
  ).toBeVisible({ timeout: 10_000 });

  await page.goto("/anpassungen");
  await expect(page.getByRole("heading", { level: 1, name: "Anpassungen" })).toBeVisible();
  const tablist = page.getByRole("tablist", { name: "Adaptions-Tabs" });
  await expect(tablist.getByRole("tab", { name: "Anpassungen" })).toBeVisible();
  await expect(tablist.getByRole("tab", { name: "Personalisierung" })).toBeVisible();
  await expect(tablist.getByRole("tab", { name: "Pausen" })).toBeVisible();

  await page.goto("/einstellungen");
  await expect(page.getByRole("heading", { level: 1, name: "Einstellungen" })).toBeVisible();
  await expect(page.getByText("Aufgabe anlegen: Zusatzfelder")).toBeVisible();
  await expect(page.getByText("Vorschläge", { exact: true })).toBeVisible();
  await expect(page.getByText("Eingriffsstufe", { exact: true })).toBeVisible();
});

test("@study @adaptive familienplanner shows time overlap hint in week planner", async ({ page }) => {
  await page.goto("/kalender");
  await expect(page.getByRole("heading", { level: 1, name: "Kalender" })).toBeVisible();
  // Demo-Konflikt liegt auf „heute + 2“; je nach Wochenstart ggf. erst nach „Nächste Woche“ sichtbar.
  let found = false;
  for (let w = 0; w < 6; w += 1) {
    if ((await page.getByText(/überlappt/i).count()) > 0) {
      await expect(page.getByText(/überlappt/i).first()).toBeVisible();
      found = true;
      break;
    }
    if (w < 5) await page.getByRole("button", { name: "Nächste Woche" }).click();
  }
  expect(found, "Demo-Aufgaben mit Zeitüberlappung sollten im sichtbaren Wochenraster erscheinen").toBe(true);
});

