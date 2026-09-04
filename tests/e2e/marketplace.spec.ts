import { expect, test } from "@playwright/test";

test.use({ actionTimeout: 30_000, navigationTimeout: 120_000 });
test.describe.configure({ timeout: 180_000 });

test("public marketplace exposes search and complete listing filters", async ({
  isMobile,
  page,
}) => {
  await page.goto("/find-a-part");
  await expect(
    page.getByRole("heading", { level: 1, name: "Marketplace parts" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Search part name, OEM number, vehicle, or seller"),
  ).toBeVisible();
  const filters = isMobile
    ? page.getByRole("dialog", { name: "Filter parts" })
    : page.getByRole("complementary", { name: "Marketplace filters" });
  if (isMobile) await page.getByRole("button", { name: "Filter" }).click();
  await expect(filters.getByLabel("Category")).toBeVisible();
  await expect(filters.getByLabel("Vehicle")).toBeVisible();
  await expect(filters.getByLabel("Condition")).toBeVisible();
  await expect(page.getByText(/approved parts/i).first()).toBeVisible();
  if (isMobile) await filters.getByRole("button", { name: "Close filters" }).click();

  await page
    .getByLabel("Search part name, OEM number, vehicle, or seller")
    .fill("04465");
  await page.getByRole("button", { name: "Search parts" }).click();
  await expect(page).toHaveURL(/q=04465/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Results for/ }),
  ).toBeVisible({ timeout: 120_000 });
});

test("unapproved or unknown product slugs are not public", async ({ page }) => {
  await page.goto("/parts/not-an-approved-marketplace-product");
  await expect(
    page.getByRole("heading", {
      name: /This road does not lead to a part/i,
    }),
  ).toBeVisible();
});

test("requesting a part requires a buyer session and preserves the destination", async ({
  page,
}) => {
  await page.goto("/find-a-part");
  await page.getByRole("link", { name: "Request a part" }).click();
  await expect(page).toHaveURL(/\/login\?/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(
    "/account/requests/new",
  );
});
