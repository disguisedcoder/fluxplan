import { defineConfig, devices } from "@playwright/test";

/** Prefer IPv4 loopback: on some Windows setups `localhost` resolves to ::1 while the dev server listens on IPv4 only. */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const isCI = !!process.env.CI;
/** Set when the app is already running (e.g. `app` service in docker-compose). */
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "true" || process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1";
/** Docker Compose E2E: bypass system proxy for internal base URLs (plain HTTP to app / loopback). */
const disableChromiumProxy =
  skipWebServer && (baseURL.includes("app:") || baseURL.includes("127.0.0.1"));

export default defineConfig({
  testDir: "./tests",
  /** Docker E2E + Next dev can exceed 60s when a step waits on network + retries. */
  timeout: isCI ? 120_000 : 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Single worker in CI: shared Postgres + many session resets; parallel runs were flaky (timeouts, closed pages).
  workers: isCI ? 1 : 2,
  reporter: [
    ["line"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL,
    // Docker + bind-mounted test-results: trace/video artifacts occasionally hit ENOENT on dispose; keep CI lean.
    trace: isCI ? "off" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: isCI ? "off" : "retain-on-failure",
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

