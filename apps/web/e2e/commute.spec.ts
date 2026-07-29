import { expect, test } from "@playwright/test";

test("closes departures search after selecting a stop", async ({ page }) => {
  test.setTimeout(60_000);

  await page.route("**/api/stops/search**", async (route) => {
    await route.fulfill({
      json: [{ id: "9700", name: "Roslags Näsby station", modes: ["TRAIN"] }]
    });
  });
  await page.route("**/api/departures/*", async (route) => {
    await route.fulfill({
      json: {
        site: { id: "9633", name: "Roslags Näsby" },
        departures: [],
        fetchedAt: new Date().toISOString(),
        isStale: false
      }
    });
  });

  await page.goto("/#hallplatser");
  const departuresSearch = page.locator('input[aria-label="Sök hållplats"]').nth(2);
  await departuresSearch.fill("Roslags Näsby");
  await page.getByRole("option", { name: /Roslags Näsby station/ }).click();

  await expect(page).toHaveURL(/\/stop\/9700$/);
  await expect(page.locator('input[aria-label="Sök hållplats"]')).toHaveValue("");
  await expect(page.getByRole("option", { name: /Roslags Näsby station/ })).toHaveCount(0);
});

test("creates a commute profile and shares it via QR link", async ({ page }) => {
  const departureAt = new Date(Date.now() + 20 * 60_000).toISOString();
  let journeyRequestUrl = "";

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
    journeyRequestUrl = route.request().url();
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
  await page.getByText("Var framme vid", { exact: true }).first().click();
  await page.getByLabel("Dag").fill("2026-08-03");
  await page.locator("#journey-time").fill("08:15");
  await page.getByLabel("Föredragna linjer").fill("13");
  await page.getByRole("button", { name: "Reseförslag" }).click();
  await expect(page.getByRole("heading", { name: "Reseförslag" })).toBeVisible();
  await expect(page.getByText("Hämtar reseförslag...").or(page.getByText(/min ·/))).toBeVisible();
  const journeyRequest = new URL(journeyRequestUrl);
  expect(journeyRequest.searchParams.get("searchMode")).toBe("arrival");
  expect(journeyRequest.searchParams.get("searchDate")).toBe("2026-08-03");
  expect(journeyRequest.searchParams.get("searchTime")).toBe("08:15");
  await expect(page.getByText(/Framme 3 augusti kl\. 08:15/)).toBeVisible();

  await page.getByRole("link", { name: /Visa detaljer för resa/ }).click();
  await expect(page).toHaveURL(/\/resa\/j1/);
  await expect(page.getByRole("heading", { name: "Resedetaljer" })).toBeVisible();
  await expect(page.getByText("Slussen → T-Centralen").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Spara / öppna" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lägg till i kalender" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Google Kalender" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Google Maps" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Apple Maps" })).toBeVisible();

  await page.getByRole("link", { name: "Tillbaka" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Reseförslag" })).toBeVisible();

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
  await expect(page.getByText("Slussen", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("T-Centralen", { exact: true }).first()).toBeVisible();
  await expect(page).not.toHaveURL(/[?&]share=/);
});
