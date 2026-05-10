import { makeVariantFixture, expect } from "./fixtures/variants";
import { request } from "@playwright/test";
import {
  createTask,
  evaluateAdaptive,
  listSuggestions,
  respondSuggestion,
} from "./utils/appApi";
import { expectEventuallyToBeTruthy } from "./utils/expectEventually";

const test = makeVariantFixture("adaptive", "familienplanner");

test.describe("@adaptive @study familienplanner — Adaptive-UI (Oberfläche + Engine)", () => {
  test("Anpassungen: Transparenz, Tabs, alle sieben Regelnamen, Probelauf löst POST /api/adaptive/evaluate aus", async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("baseURL is required");
    // Tab-Zustand kommt aus ?tab= — direkte Navigation ist in E2E zuverlässiger als Soft-Navigation nach Klick.
    await page.goto("/anpassungen?tab=personalization");
    await page
      .waitForResponse(
        (r) => r.url().includes("/api/rules") && r.request().method() === "GET" && r.ok(),
        { timeout: 60_000 },
      )
      .catch(() => {});
    await expect(page.getByRole("heading", { level: 1, name: "Anpassungen" })).toBeVisible();

    await expect(page.getByText("Was FluxPlan gerade berücksichtigt")).toBeVisible({ timeout: 30_000 });

    const tablist = page.getByRole("tablist", { name: "Adaptions-Tabs" });
    const persTab = tablist.getByRole("tab", { name: "Personalisierung" });
    await expect(persTab).toHaveAttribute("aria-selected", "true", { timeout: 15_000 });

    await expect(page.getByTestId("fp-personalization-panel")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Aktive Regeln" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Keine Regeln gefunden")).not.toBeVisible();
    // Regel-`name` aus DB; `key`-Badge bleibt stabil (z. B. daily_focus).
    await expect(
      page.getByText("Fokusvorschlag", { exact: true }).or(page.getByText("daily_focus", { exact: true })),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByText("Ansichtspräferenz", { exact: true }).or(page.getByText("view_preference", { exact: true })),
    ).toBeVisible();
    await expect(
      page
        .getByText("Erinnerungs-Präferenz", { exact: true })
        .or(page.getByText("reminder_preference", { exact: true })),
    ).toBeVisible();
    await expect(
      page
        .getByText("Kalender-Konflikthinweis", { exact: true })
        .or(page.getByText("calendar_conflict", { exact: true })),
    ).toBeVisible();
    await expect(
      page
        .getByText("Adaptives Aufgabenformular", { exact: true })
        .or(page.getByText("adaptive_task_creation", { exact: true })),
    ).toBeVisible();
    await expect(
      page
        .getByText("Formular: Zusatzfelder einklappen", { exact: true })
        .or(page.getByText("adaptive_optional_fold", { exact: true })),
    ).toBeVisible();
    await expect(
      page
        .getByText("Formular: Zusatzfelder wieder ausklappen", { exact: true })
        .or(page.getByText("adaptive_optional_unfold", { exact: true })),
    ).toBeVisible();

    const evalResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/adaptive/evaluate") &&
        res.request().method() === "POST" &&
        res.ok(),
      { timeout: 30_000 },
    );
    await page.getByRole("button", { name: "Jetzt prüfen" }).click();
    await evalResponse;

    await tablist.getByRole("tab", { name: "Pausen" }).click();
    await expect(page.getByText("Pausierte Regeln")).toBeVisible();
    await expect(page.getByText("Aktuell keine Regel pausiert.")).toBeVisible();
  });

  test("Heute: adaptiver Status + Vorschlags-Banner oder Steuer-Buttons", async ({ page }) => {
    await page.goto("/heute");
    await expect(page.getByRole("heading", { level: 1, name: "Heute" })).toBeVisible();
    await expect(page.getByText(/Vorschlag verfügbar|Keine Vorschläge offen/)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Modus: Adaptive")).toBeVisible({ timeout: 20_000 });
    // Banner erscheint nur bei pending Vorschlag; Statuskarte kann „Keine Vorschläge offen“ zeigen.
    if (await page.getByText("Keine Vorschläge offen").isVisible()) return;
    await expect(
      page.getByRole("button", { name: "Nicht jetzt" }).or(page.getByRole("button", { name: "Annehmen" })).first(),
    ).toBeVisible({ timeout: 25_000 });
  });
});

test.describe("@adaptive @study familienplanner — Regeln (API, konsistent mit Seed)", () => {
  test("daily_focus ist nach Evaluate auf /heute auslösbar", async ({ page, baseURL }) => {
    if (!baseURL) throw new Error("baseURL is required");
    const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });
    try {
      await evaluateAdaptive(api, "/heute");
      const focus = await expectEventuallyToBeTruthy(async () => {
        const pending = await listSuggestions(api, "pending");
        return pending.suggestions.find((s) => s.ruleKey === "daily_focus") ?? null;
      }, { timeoutMs: 30_000, intervalMs: 1_000, message: "daily_focus pending (familienplanner)" });
      expect(focus.ruleKey).toBe("daily_focus");
      expect(focus.type).toBe("daily_focus");

      const accepted = await respondSuggestion(api, focus.id, "accept");
      expect(accepted.suggestion.status).toBe("accepted");
      await expect
        .poll(
          async () => {
            const prefsOn = (await (await api.get("/api/preferences")).json()).preferences ?? {};
            const v = prefsOn["adaptive.dailyFocusListHighlight"];
            return Boolean(v && typeof v === "object" && (v as { enabled?: unknown }).enabled === true);
          },
          { timeout: 15_000 },
        )
        .toBe(true);

      const undone = await respondSuggestion(api, focus.id, "undo");
      expect(undone.suggestion.status).toBe("pending");
      await expect
        .poll(
          async () => {
            const prefsOff = (await (await api.get("/api/preferences")).json()).preferences ?? {};
            const v = prefsOff["adaptive.dailyFocusListHighlight"];
            return !(v && typeof v === "object" && (v as { enabled?: unknown }).enabled === true);
          },
          { timeout: 15_000 },
        )
        .toBe(true);
    } finally {
      await api.dispose();
    }
  });

  test("view_preference nach wiederholten view_changed", async ({ page, baseURL }) => {
    if (!baseURL) throw new Error("baseURL is required");
    const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

    for (let i = 0; i < 12; i += 1) {
      const r = await api.post("/api/interactions", {
        data: { type: "view_changed", screen: "/aufgaben", metadata: { to: "/aufgaben" } },
      });
      if (!r.ok()) throw new Error(`view_changed failed: ${r.status()} ${await r.text()}`);
    }

    const viewPref = await expectEventuallyToBeTruthy(async () => {
      const pending = await listSuggestions(api, "pending");
      return pending.suggestions.find((s) => s.ruleKey === "view_preference") ?? null;
    }, { timeoutMs: 25_000, intervalMs: 500, message: "view_preference pending" });
    expect(viewPref.ruleKey).toBe("view_preference");
    await respondSuggestion(api, viewPref.id, "snooze");
    await api.dispose();
  });

  test("reminder_preference bei neuer Aufgabe ohne Erinnerung (Liste Familie)", async ({ page, baseURL }) => {
    if (!baseURL) throw new Error("baseURL is required");
    const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

    const due = new Date();
    due.setDate(due.getDate() + 2);
    due.setHours(12, 0, 0, 0);

    await createTask(api, {
      title: `PW_FP_REM_${Date.now()}`,
      dueDate: due.toISOString(),
      listName: "Familie",
      priority: "medium",
    });

    const reminder = await expectEventuallyToBeTruthy(async () => {
      const pending = await listSuggestions(api, "pending");
      return pending.suggestions.find((s) => s.ruleKey === "reminder_preference") ?? null;
    }, { timeoutMs: 30_000, intervalMs: 1_000, message: "reminder_preference pending" });
    expect(reminder.ruleKey).toBe("reminder_preference");
    await api.dispose();
  });

  test("calendar_conflict bei hoher Tageslast (task_created)", async ({ page, baseURL }) => {
    if (!baseURL) throw new Error("baseURL is required");
    const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

    const due = new Date();
    due.setHours(10, 0, 0, 0);
    await createTask(api, {
      title: `PW_FP_CONFLICT_${Date.now()}`,
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

  test("adaptive_task_creation nach wiederholter Nutzung von Datum + Erinnerung", async ({ page, baseURL }) => {
    if (!baseURL) throw new Error("baseURL is required");
    const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

    const base = new Date();
    base.setDate(base.getDate() + 2);
    base.setHours(9, 0, 0, 0);

    for (let i = 0; i < 6; i += 1) {
      const due = new Date(base.getTime() + i * 60_000);
      const reminder = new Date(due.getTime() - 60 * 60 * 1000);
      await createTask(api, {
        title: `PW_FP_CHIPS_${Date.now()}_${i}`,
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
    await respondSuggestion(api, chips.id, "snooze");
    await api.dispose();
  });

  test("adaptive_optional_fold nach mehreren minimalen Aufgaben", async ({ page, baseURL }) => {
    if (!baseURL) throw new Error("baseURL is required");
    const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

    const pendingChips = await listSuggestions(api, "pending");
    const chips = pendingChips.suggestions.find((s) => s.ruleKey === "adaptive_task_creation");
    if (chips) await respondSuggestion(api, chips.id, "snooze");

    for (let i = 0; i < 8; i += 1) {
      await createTask(api, {
        title: `PW_FP_FOLD_${Date.now()}_${i}`,
        priority: "low",
      });
    }

    const fold = await expectEventuallyToBeTruthy(async () => {
      const pending = await listSuggestions(api, "pending");
      return pending.suggestions.find((s) => s.ruleKey === "adaptive_optional_fold") ?? null;
    }, { timeoutMs: 30_000, intervalMs: 1_000, message: "adaptive_optional_fold pending" });
    expect(fold.ruleKey).toBe("adaptive_optional_fold");
    await respondSuggestion(api, fold.id, "snooze");
    await api.dispose();
  });
});
