import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "drizzle/0017_cloudy_vapor.sql"), "utf8");
const pushService = readFileSync(resolve(process.cwd(), "src/lib/notifications/push.ts"), "utf8");
const pushClient = readFileSync(
  resolve(process.cwd(), "src/components/notifications/push-notification-manager.tsx"),
  "utf8",
);
const serviceWorker = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
const orderService = readFileSync(resolve(process.cwd(), "src/lib/commerce/orders.ts"), "utf8");

describe("notification and PWA security", () => {
  it("enables RLS and removes direct subscription-table privileges", () => {
    expect(migration).toContain('ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.notifications FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.push_subscriptions FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain(
      "GRANT UPDATE (read_at) ON TABLE public.notifications TO authenticated",
    );
    expect(migration).not.toMatch(/GRANT (?:INSERT|UPDATE|DELETE)[^;]+public\.push_subscriptions/);
  });

  it("limits notification reads to owners and protects immutable fields", () => {
    expect(migration).toContain('"notifications_select_own"');
    expect(migration).toContain('"push_subscriptions_select_own"');
    expect(migration).toContain("notifications_protect_fields");
    expect(migration).toContain("push_subscriptions_protect_identity");
    expect(migration).toContain("Only read_at can be changed by notification recipients");
  });

  it("keeps VAPID private material server-only", () => {
    expect(pushService).toContain('import "server-only"');
    expect(pushService).toContain("VAPID_PRIVATE_KEY");
    expect(pushClient).not.toContain("VAPID_PRIVATE_KEY");
    expect(serviceWorker).not.toContain("VAPID_PRIVATE_KEY");
    expect(pushClient).toContain("Notification.requestPermission()");
  });

  it("uses same-origin notification destinations and does not intercept application fetches", () => {
    expect(serviceWorker).toContain("target.origin === self.location.origin");
    expect(serviceWorker).toContain('self.addEventListener("notificationclick"');
    expect(serviceWorker).not.toContain('self.addEventListener("fetch"');
  });

  it("dispatches idempotent order notifications after verified fulfillment", () => {
    expect(pushService).toContain("order-paid:buyer:");
    expect(pushService).toContain("order-paid:seller:");
    expect(orderService).toContain("await notifyPaidOrderSafely(result.orderId)");
    const transactionEnd = orderService.indexOf('if (result.status === "PAID")');
    const transactionStart = orderService.indexOf(
      "const result = await database.transaction",
      orderService.indexOf("verifyAndFulfillKoraPayment"),
    );
    expect(transactionStart).toBeGreaterThan(-1);
    expect(transactionEnd).toBeGreaterThan(transactionStart);
  });
});
