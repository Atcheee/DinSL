import { defineConfig, devices } from "@playwright/test";

const displayConfig = JSON.stringify([
  {
    id: "e2e-screen",
    token: "e2e-display-token",
    siteId: "9192",
    venueName: "Testlokalen",
    preferredLines: ["13"],
    refreshSeconds: 20
  }
]);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } }
  ],
  webServer: {
    command: "next dev --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: true,
    timeout: 120_000,
    env: { DISPLAY_CONFIGS_JSON: displayConfig }
  }
});
