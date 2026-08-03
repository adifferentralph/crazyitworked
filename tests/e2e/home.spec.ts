import { expect, test } from "@playwright/test";

test("homepage exposes search and vehicle fitment", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /TorqueMart Automotive Parts Marketplace/i }),
  ).toBeVisible();
  await expect(page.getByLabel("Search automotive parts")).toBeVisible();
  await expect(page.getByRole("button", { name: "Fit" })).toBeVisible();
});
