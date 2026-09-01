import { expect, test } from "@playwright/test";

const mobileWidths = [320, 375, 390, 400] as const;

test.use({ actionTimeout: 30_000, navigationTimeout: 180_000 });
test.describe.configure({ timeout: 360_000 });

test("mobile marketplace home remains usable at required widths", async ({ page }) => {
  for (const width of mobileWidths) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Find the exact part. Faster.", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Twenty-Two Parts/i }).first()).toBeVisible();
    await expect(page.getByRole("navigation", {
      name: "Mobile marketplace navigation",
    })).toBeVisible();
    await expect(page.getByRole("complementary", {
      name: "Marketplace filters",
    })).toBeHidden();
  }
});

test("category icons are semantic and category navigation owns results", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/categories");

  const navigation = page.getByRole("navigation", {
    name: "Mobile marketplace navigation",
  });
  await expect(navigation.getByRole("link", { name: "Categories" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const categoryCards = page.locator("[data-category-icon]");
  await expect(categoryCards.first()).toBeVisible();
  const iconKeys = await categoryCards.evaluateAll((cards) =>
    cards.slice(0, 6).map((card) => card.getAttribute("data-category-icon")),
  );
  expect(new Set(iconKeys).size).toBeGreaterThan(2);

  await page.locator('a[href^="/categories/"]').first().click();
  await expect(page).toHaveURL(/\/categories\/[^/?#]+$/);
  await expect(page.getByRole("button", { name: "Filter" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sort" })).toBeVisible();
});

test("mobile filters and sort controls apply real query parameters", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/find-a-part");

  await page.getByRole("button", { name: "Filter" }).click();
  const filterDialog = page.getByRole("dialog", { name: "Filter parts" });
  await expect(filterDialog).toBeVisible();
  await filterDialog.getByLabel("Condition").selectOption("NEW");
  await filterDialog.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/condition=NEW/);

  await page.getByRole("button", { name: "Sort" }).click();
  const sortDialog = page.getByRole("dialog", { name: "Sort parts" });
  await expect(sortDialog).toBeVisible();
  await sortDialog.getByLabel("Sort by").selectOption("price-asc");
  await sortDialog.getByRole("button", { name: "Apply sort" }).click();
  await expect(page).toHaveURL(/sort=price-asc/);

  const navigation = page.getByRole("navigation", {
    name: "Mobile marketplace navigation",
  });
  await expect(navigation.getByRole("link", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
