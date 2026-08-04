import { expect, test } from "@playwright/test";

test("landing page exposes the complete public story", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /find the right part/i, level: 1 })).toBeVisible();
  await expect(page.getByRole("search")).toBeVisible();
  await expect(page.getByLabel(/search by part name/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /start with the system/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /from an uncertain request/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /less like guesswork/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /clear answers/i })).toBeVisible();
});

test("landing page has an accessible mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.locator("header summary").click();
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: "Categories" })).toBeVisible();
});
