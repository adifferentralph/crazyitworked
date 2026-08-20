import { expect, test } from "@playwright/test";

test("landing page exposes the complete public story", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /source the exact part you need/i, level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("search")).toBeVisible();
  await expect(page.getByLabel(/search by part name/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /start with the system/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /from an uncertain request/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /less like guesswork/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /straight answers/i })).toBeVisible();

  await expect(page.getByRole("link", { name: "Find a part" }).first()).toHaveAttribute(
    "href",
    "/signup/buyer",
  );
  await expect(page.getByRole("link", { name: "For suppliers" }).first()).toHaveAttribute(
    "href",
    "/signup/seller",
  );
});

test("landing page has an accessible mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.locator("header summary").click();
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNavigation).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: "Categories" })).toBeVisible();
  await expect(mobileNavigation.getByRole("link", { name: "Supplier access" })).toHaveAttribute(
    "href",
    "/signup/seller",
  );
});

test("buyer, supplier, and login entry pages expose the correct forms", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/signup/buyer");
  await expect(
    page.getByRole("heading", { name: "Create a buyer account", level: 2 }),
  ).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create buyer account" })).toBeVisible();

  await page.goto("/signup/seller");
  await expect(
    page.getByRole("heading", { name: "Create a supplier account", level: 2 }),
  ).toBeVisible();
  await expect(page.getByLabel("Store or business name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create supplier account" })).toBeVisible();

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in", level: 2 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
    "href",
    "/forgot-password",
  );
});
