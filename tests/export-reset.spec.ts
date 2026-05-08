import { adaptiveTest as test, expect } from "./fixtures/variants";
import { request } from "@playwright/test";
import { exportJson, listTasks, resetUserData } from "./utils/appApi";

test("@api export works and reset clears data", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("baseURL is required");
  const api = await request.newContext({ baseURL, storageState: await page.context().storageState() });

  const before = await exportJson(api);
  expect(typeof before.summary?.totalTasks).toBe("number");
  expect((before.summary?.totalTasks as number) > 0).toBeTruthy();

  await resetUserData(api);
  const afterTasks = await listTasks(api, { status: "open" });
  expect(afterTasks.tasks.length).toBe(0);

  await api.dispose();
});

