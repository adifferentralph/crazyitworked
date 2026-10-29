import { expect, test } from "@playwright/test";

test.use({ actionTimeout: 30_000, navigationTimeout: 120_000 });
test.describe.configure({ timeout: 180_000 });

test("product cards expose an honest trust score and accessible report menu", async ({
  isMobile,
  page,
}) => {
  await page.goto("/find-a-part");
  const card = page.locator("[data-marketplace-product]").first();
  await expect(card).toBeVisible();
  await expect(card.getByLabel(/marketplace trust score.*not a customer review average/i)).toBeVisible();

  const menuButton = card.getByRole("button", { name: "Product reporting options" });
  if (!isMobile) await card.hover();
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  await card.getByRole("menuitem", { name: "Report Product" }).click();
  await expect(page.getByRole("dialog", { name: "Report product" })).toBeVisible();
  await expect(page.getByText(/does not change a trust score until it is reviewed and upheld/i)).toBeVisible();
});
