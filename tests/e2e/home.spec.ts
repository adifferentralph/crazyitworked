import { expect, test } from "@playwright/test";

test.use({ navigationTimeout: 180_000 });

test("marketplace home exposes real discovery paths", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Find the exact part. Faster.", level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole("search")).toBeVisible();
  await expect(
    page.getByLabel(/search part name, OEM number, vehicle, or seller/i),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Shop by category" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cannot find the exact part?" }),
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Find a part" }).first()).toHaveAttribute(
    "href",
    "/find-a-part",
  );
  await expect(page.locator('a[href="/signup/seller"]').first()).toHaveAttribute(
    "href",
    "/signup/seller",
  );
  await expect(page.getByRole("link", { name: "Request a part" })).toHaveAttribute(
    "href",
    "/login?next=/account/requests/new",
  );
});

test("marketplace home has accessible route-aware mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("link", { name: /Twenty-Two Parts/i }).first()).toBeVisible();
  const navigation = page.getByRole("navigation", {
    name: "Mobile marketplace navigation",
  });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(navigation.getByRole("link", { name: "Categories" })).toHaveAttribute(
    "href",
    "/categories",
  );
  await expect(navigation.getByRole("link", { name: "Requests" })).toHaveAttribute(
    "href",
    "/login?next=/account/requests",
  );
  await expect(navigation.getByRole("link", { name: "Cart" })).toHaveAttribute(
    "href",
    "/login?next=/cart",
  );
});

test("buyer, supplier, and login entry pages expose the correct forms", async ({ page }) => {
  test.setTimeout(360_000);
  await page.goto("/signup/buyer");
  await expect(
    page.getByRole("heading", { name: "Create a buyer account", level: 2 }),
  ).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create buyer account" })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
    "href",
    "/privacy-policy",
  );

  await page.getByRole("button", { name: "Create buyer account" }).click();
  await expect(page.getByLabel("Full name")).toHaveAttribute("aria-invalid", "true", {
    timeout: 30_000,
  });
  await expect(page.getByLabel("Full name")).toBeFocused();

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

test("privacy policy is available from the public site", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/privacy-policy");
  await expect(page.getByRole("heading", { name: "Privacy Policy", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: /your privacy rights/i })).toBeVisible();
});
