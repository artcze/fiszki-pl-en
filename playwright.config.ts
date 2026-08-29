import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:4322";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",

  use: {
    baseURL,
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  webServer: [
    {
      command: "tsx tests/e2e/mock-libretranslate.ts",
      url: "http://127.0.0.1:54330/health",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --mode e2e --host 127.0.0.1 --port 4322",
      env: { CLOUDFLARE_ENV: "e2e" },
      url: baseURL,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
