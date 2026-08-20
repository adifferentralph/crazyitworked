import { expect, test } from "@playwright/test";

test("password visibility works after browser hydration", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/login");
  const passwordInput = page.getByLabel("Password", { exact: true });
  await passwordInput.fill("a-private-password");
  await expect(passwordInput).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(passwordInput).toHaveAttribute("type", "text");
  await expect(passwordInput).toHaveValue("a-private-password");

  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await expect(passwordInput).toHaveAttribute("type", "password");
  expect(pageErrors).toEqual([]);
});
