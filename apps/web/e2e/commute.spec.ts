import { expect, test } from "@playwright/test";

test("creates a commute profile and shares it via QR link", async ({ page }) => {
  const departureAt = new Date(Date.now() + 20 * 60_000).toISOString();

  await page.route("**/api/stops/search**", async (route) => {
    await route.fulfill({
      json: [
        { id: "9192", name: "Slussen", gid: "9091001000009192", modes: ["METRO"] },
        { id: "9001", name: "T-Centralen", gid: "9091001000009001", modes: ["METRO"] }
      ]
    });
  });
  await page.route("**/api/departures/9192", async (route) => {
    await route.fulfill({
      json: {
        site: { id: "9192", name: "Slussen" },
        departures: [
          {
            id: "d1",
            line: "13",
            destination: "Ropsten",
            expectedTime: departureAt,
            scheduledTime: departureAt,
            platform: "2"
          }
        ],
        fetchedAt: new Date().toISOString(),
        isStale: false
      }
    });
  });
  await page.route("**/api/journeys**", async (route) => {
    await route.fulfill({
      json: {
        journeys: [
          {
            id: "j1",
            durationSeconds: 720,
            interchanges: 0,
            wheelchairFriendly: true,
            accessibilityNotes: [],
            legs: [
              {
                mode: "Tunnelbana",
                line: "13",
                originName: "Slussen",
                destinationName: "T-Centralen",
                departureTime: departureAt,
                arrivalTime: new Date(Date.now() + 32 * 60_000).toISOString(),
                durationSeconds: 720,
                infos: []
              }
            ]
          }
        ],
        fetchedAt: new Date().toISOString()
      }
    });
  });

  await page.goto("/");
  await page.locator('input[aria-label="Sök hållplats"]').first().fill("Slussen");
  await page.getByRole("option", { name: /Slussen/ }).click();
  await page.locator('input[aria-label="Sök hållplats"]').nth(1).fill("T-Centralen");
  await page.getByRole("option", { name: /T-Centralen/ }).click();
  await page.getByLabel("Föredragna linjer").fill("13");
  await page.getByRole("button", { name: "Reseförslag" }).click();
  await expect(page.getByRole("heading", { name: "Reseförslag" })).toBeVisible();
  await expect(page.getByText("Hämtar reseförslag...").or(page.getByText(/min ·/))).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Gå om \d+ min/)).toBeVisible();

  await expect(page.getByRole("heading", { name: "Dela resa" })).toBeVisible();
  const qr = page.getByRole("img", { name: "QR-kod för delad resa" });
  await expect(qr).toBeVisible();

  const shareUrl = await qr.getAttribute("data-share-url");
  expect(shareUrl).toMatch(/[?&]share=/);

  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: /Kopiera länk/ }).click();
  await expect(page.getByText("Länk kopierad")).toBeVisible();

  await page.goto(shareUrl!);
  await expect(page.getByText("Slussen")).toBeVisible();
  await expect(page.getByText("T-Centralen")).toBeVisible();
  await expect(page).not.toHaveURL(/[?&]share=/);
});
