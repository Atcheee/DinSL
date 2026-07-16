import { expect, test } from "@playwright/test";

test("creates a commute profile and opens a tokenized display", async ({ page }) => {
  const departureAt = new Date(Date.now() + 20 * 60_000).toISOString();

  await page.route("**/api/stops/search**", async (route) => {
    await route.fulfill({ json: [{ id: "9192", name: "Slussen", modes: ["METRO"] }] });
  });
  await page.route("**/api/departures/9192", async (route) => {
    await route.fulfill({
      json: {
        site: { id: "9192", name: "Slussen" },
        departures: [{ id: "d1", line: "13", destination: "Ropsten", expectedTime: departureAt, scheduledTime: departureAt, platform: "2" }],
        fetchedAt: new Date().toISOString(),
        isStale: false
      }
    });
  });

  await page.goto("/");
  await page.locator('input[aria-label="Sök hållplats"]').first().fill("Slussen");
  await page.getByRole("option", { name: /Slussen/ }).click();
  await page.getByLabel("Destination").fill("Kontoret");
  await page.getByLabel("Föredragna linjer").fill("13");
  await page.getByRole("button", { name: "Spara resa" }).click();
  await expect(page.getByText("Sparad", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Gå om \d+ min/)).toBeVisible();

  await page.getByLabel("Skärmtoken").fill("e2e-display-token");
  await page.getByRole("button", { name: /Öppna skärm/ }).click();
  await expect(page).toHaveURL(/\/display\/e2e-display-token$/);
  await expect(page.getByRole("heading", { name: "Slussen" })).toBeVisible();
  await expect(page.getByText("Testlokalen")).toBeVisible();
  await expect(page.getByText("Ropsten")).toBeVisible();
});
