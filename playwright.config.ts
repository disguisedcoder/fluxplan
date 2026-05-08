import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isCI = !!process.env.CI;
/** Set when the app is already running (e.g. `app` service in docker-compose). */
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "true" || process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1";
/** Docker Compose E2E: bypass system proxy for internal base URLs (plain HTTP to app / loopback). */
const disableChromiumProxy =
  skipWebServer && (baseURL.includes("app:") || baseURL.includes("127.0.0.1"));

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Keep DB load predictable (avoid flakiness / crashes).
  workers: isCI ? 2 : 2,
  reporter: [
    ["line"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...(disableChromiumProxy
      ? {
          launchOptions: {
            args: ["--proxy-server=direct://"],
          },
        }
      : {}),
  },
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: baseURL,
          reuseExistingServer: !isCI,
          timeout: 120_000,
          env: {
            ...process.env,
            // Make time-based adaptive behavior demo-friendly for E2E.
            DEMO_MODE: process.env.DEMO_MODE ?? "true",
            // Keep the suite fast: default to 60s, override to 600000 for “true 10min” demos.
            FP_SNOOZE_MS: process.env.FP_SNOOZE_MS ?? "60000",
            FP_COOLDOWN_WINDOW_MS: process.env.FP_COOLDOWN_WINDOW_MS ?? "60000",
            FP_COOLDOWN_DURATION_MS: process.env.FP_COOLDOWN_DURATION_MS ?? "60000",
          },
        },
      }),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

