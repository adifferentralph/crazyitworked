import { expect, test } from "@playwright/test";

test("assisted inventory is protected and the CSV template is usable", async ({ page, request }) => {
  await page.goto("/admin/inventory-onboarding");
  await expect(page).toHaveURL(/\/login\?/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/admin/inventory-onboarding");

  const template = await request.get("/templates/inventory-import-template.csv");
  expect(template.ok()).toBe(true);
  const content = await template.text();
  expect(content).toContain("SKU,Part Name,Category,Brand,Condition");
  expect(content).toContain("Vehicle Make,Vehicle Model,Year From,Year To,Location");
});