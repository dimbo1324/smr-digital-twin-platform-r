import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"], ["html"]],
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node ./node_modules/vite/bin/vite.js --host 127.0.0.1",
    url: baseURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true" && !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8080",
      VITE_API_RUNTIME_VALIDATION: process.env.VITE_API_RUNTIME_VALIDATION ?? "strict",
    },
  },
});
