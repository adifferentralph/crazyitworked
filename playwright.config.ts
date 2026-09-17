import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.PLAYWRIGHT_MAP_VENDOR_LOCALHOST === "1"
          ? {
              launchOptions: {
                args: ["--host-resolver-rules=MAP vendors.localhost 127.0.0.1"],
              },
            }
          : {}),
      },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        env: {
          ...process.env,
          NEXT_PUBLIC_APP_URL: "http://localhost:3000",
          NEXT_PUBLIC_VENDOR_APP_URL: "http://vendors.localhost:3000",
        },
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
