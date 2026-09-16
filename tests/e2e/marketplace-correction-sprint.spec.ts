import { expect, test } from "@playwright/test";

test.use({ actionTimeout: 90_000, navigationTimeout: 180_000 });
test.describe.configure({ timeout: 360_000 });

test("marketplace hierarchy, category chips, and local vehicle search work on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");

  await expect(
    page.getByRole("region", { name: "Marketplace highlights" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { exact: true, name: "Categories" }),
  ).toBeVisible();

  const categories = page.getByRole("navigation", {
    name: "Marketplace categories",
  });
  await expect(categories).toBeVisible();
  expect(
    await categories.evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
  await expect(
    categories.getByRole("link", { name: /View all \d+ active categories/ }),
  ).toBeVisible();

  const makeInput = page.getByPlaceholder("Search make...");
  for (const [query, expected] of [
    ["toy", "Toyota"],
    ["merc", "Mercedes-Benz"],
    ["peu", "Peugeot"],
    ["ford", "Ford"],
    ["hyun", "Hyundai"],
    ["land", "Land Rover"],
    ["byd", "BYD"],
    ["tata", "Tata"],
    ["volv", "Volvo"],
    ["mitsu", "Mitsubishi"],
    ["saab", "SAAB"],
  ] as const) {
    await makeInput.fill(query);
    await expect(
      page.getByRole("option", { name: new RegExp(expected, "i") }).first(),
    ).toBeVisible({ timeout: 60_000 });
  }

  await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
});

test("cookie consent is retained and preferences control analytics state", async ({
  page,
}) => {
  await page.goto("/");

  const consent = page.getByRole("complementary", { name: "Cookie consent" });
  await expect(consent).toBeVisible();
  await consent.getByRole("button", { name: "Reject optional" }).click();
  await expect(consent).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.analyticsConsent),
    )
    .toBe("false");

  await page.reload();
  await expect(consent).toBeHidden();

  await page.goto("/cookie-preferences");
  const essential = page.getByRole("checkbox", { name: /Essential/ });
  await expect(essential).toBeChecked();
  await expect(essential).toBeDisabled();
  const analytics = page.getByRole("checkbox", { name: /Analytics/ });
  await expect(analytics).toBeEnabled({ timeout: 60_000 });
  await analytics.check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Cookie preferences saved.")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.analyticsConsent),
    )
    .toBe("true");
});

test("vendor host serves vendor auth without marketplace navigation", async ({
  request,
}) => {
  const vendorUrl =
    process.env.NEXT_PUBLIC_VENDOR_APP_URL ?? "http://vendors.localhost:3000";
  const vendorHost = new URL(vendorUrl).host;
  const root = await request.get(new URL("/", vendorUrl).toString(), {
    maxRedirects: 0,
    timeout: 120_000,
  });
  expect(root.status()).toBeGreaterThanOrEqual(300);
  expect(root.status()).toBeLessThan(400);
  const loginLocation = new URL(root.headers().location ?? "", vendorUrl);
  expect(loginLocation.host).toBe(vendorHost);
  expect(loginLocation.pathname).toBe("/login");

  const login = await request.get(new URL("/login", vendorUrl).toString(), {
    timeout: 120_000,
  });
  expect(login.ok()).toBe(true);
  const html = await login.text();
  expect(html).toContain("Supplier portal");
  expect(html).not.toContain("Primary navigation");
});
