import { expect, test } from "@playwright/test";

test.use({ actionTimeout: 30_000, navigationTimeout: 120_000 });
test.describe.configure({ timeout: 180_000 });

test.describe("installable web app", () => {
  test("serves a valid same-origin manifest and install icons", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/manifest+json");

    const manifest = await response.json();
    expect(manifest).toMatchObject({
      display: "standalone",
      name: "Twenty-Two Parts",
      scope: "/",
      start_url: "/",
    });
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", src: "/icons/app-icon-192.png" }),
        expect.objectContaining({ sizes: "512x512", src: "/icons/app-icon-512.png" }),
      ]),
    );

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(icon.src);
      expect(iconResponse.ok()).toBe(true);
      expect(iconResponse.headers()["content-type"]).toContain("image/png");
    }
  });

  test("serves the push worker without stale caching", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/javascript");
    expect(response.headers()["cache-control"]).toContain("no-cache");
    expect(response.headers()["service-worker-allowed"]).toBe("/");
    expect(await response.text()).toContain('self.addEventListener("push"');
  });

  test("shows an optional browser install prompt only after browser eligibility", async ({
    page,
  }) => {
    await page.goto("/");

    await page.evaluate(() => {
      const event = new Event("beforeinstallprompt") as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: "dismissed"; platform: string }>;
      };
      event.prompt = async () => undefined;
      event.userChoice = Promise.resolve({ outcome: "dismissed", platform: "web" });
      window.dispatchEvent(event);
    });

    await expect(page.getByRole("heading", { name: "Install Twenty-Two Parts" })).toBeVisible();
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(page.getByRole("heading", { name: "Install Twenty-Two Parts" })).toBeHidden();
  });

  test("keeps notification settings private", async ({ page }) => {
    await page.goto("/account/notifications");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fnotifications$/);

    await page.goto("/seller/notifications");
    await expect(page).toHaveURL(/\/login\?next=%2Fseller%2Fnotifications$/);
  });
});
