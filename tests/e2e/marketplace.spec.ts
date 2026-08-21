import { expect, test } from "@playwright/test";

test.use({ actionTimeout: 30_000, navigationTimeout: 120_000 });
test.describe.configure({ timeout: 180_000 });

test("public marketplace exposes search, filters, and progressive vehicle controls", async ({ page }) => {
  await page.goto("/find-a-part");
  await expect(page.getByRole("heading", { level: 1, name: /Find the right part/i })).toBeVisible();
  await expect(page.getByLabel("Search part name, OEM number, vehicle, or seller")).toBeVisible();
  await expect(page.getByLabel("Vehicle make")).toBeVisible();
  await expect(page.getByText(/approved part/i).first()).toBeVisible();

  await page.getByLabel("Search part name, OEM number, vehicle, or seller").fill("04465");
  await page.getByRole("button", { name: "Search parts" }).click();
  await expect(page).toHaveURL(/q=04465/);
  await expect(page.getByRole("heading", { level: 2, name: /Results for/ })).toBeVisible();
});

test("unapproved or unknown product slugs are not public", async ({ page }) => {
  await page.goto("/parts/not-an-approved-marketplace-product");
  await expect(page.getByRole("heading", { name: /This road does not lead to a part/i })).toBeVisible();
});

test("requesting a part requires a buyer session and preserves the destination", async ({ page }) => {
  await page.goto("/find-a-part");
  await page.getByRole("link", { name: "Request a part" }).click();
  await expect(page).toHaveURL(/\/login\?/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/account/requests/new");
});
