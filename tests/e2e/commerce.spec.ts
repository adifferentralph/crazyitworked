import { expect, test } from "@playwright/test";

test.use({ actionTimeout: 30_000, navigationTimeout: 120_000 });
test.describe.configure({ timeout: 180_000 });

test.describe("commerce route security", () => {
  test("checkout requires the universal login and preserves its return path", async ({
    page,
  }) => {
    await page.goto("/checkout");

    await expect(page).toHaveURL(/\/login\?next=%2Fcheckout$/);
    await expect(
      page.getByRole("heading", { level: 2, name: "Sign in" }),
    ).toBeVisible();
  });

  test("buyer and seller order history remain private", async ({ page }) => {
    await page.goto("/account/orders");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Forders$/);

    await page.goto("/seller/orders");
    await expect(page).toHaveURL(/\/login\?next=%2Fseller%2Forders$/);
  });
});
