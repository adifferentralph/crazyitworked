import { expect, test } from "@playwright/test";

const mobileWidths = [320, 375, 390, 400] as const;

test.use({ actionTimeout: 30_000, navigationTimeout: 180_000 });
test.describe.configure({ timeout: 240_000 });

test("marketplace browsing is public while private buyer routes preserve return paths", async ({
  page,
}) => {
  await page.goto("/marketplace");
  await expect(page).toHaveURL(/\/marketplace$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Find the right part for your vehicle/i,
    }),
  ).toBeVisible();

  await page.goto("/account/requests/new");
  await expect(page).toHaveURL(/\/login\?/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(
    "/account/requests/new",
  );
});

test("legacy auth routes resolve to the universal login", async ({ page }) => {
  await page.goto("/auth");
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/suppliers/auth");
  await expect(page).toHaveURL(/\/login\?/);
  expect(new URL(page.url()).searchParams.get("next")).toBe(
    "/seller/dashboard",
  );
});

test("login and signup controls start above the fold at required mobile widths", async ({
  page,
}) => {
  for (const width of mobileWidths) {
    await page.setViewportSize({ height: 700, width });

    await page.goto("/login");
    const emailBox = await page.getByLabel("Email address").boundingBox();
    expect(emailBox, `login email input should render at ${width}px`).not.toBeNull();
    expect(emailBox!.y).toBeLessThan(700);
    await expect(
      page.getByRole("button", { name: "Continue with Apple" }),
    ).toBeVisible();

    await page.goto("/signup/buyer");
    const nameBox = await page.getByLabel("Full name").boundingBox();
    expect(nameBox, `signup name input should render at ${width}px`).not.toBeNull();
    expect(nameBox!.y).toBeLessThan(700);
  }
});
