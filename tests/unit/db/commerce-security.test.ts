import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "drizzle/0016_tired_silver_centurion.sql"),
  "utf8",
);
const catalogSource = readFileSync(
  resolve(process.cwd(), "src/lib/marketplace/public-catalog.ts"),
  "utf8",
);
const koraSource = readFileSync(
  resolve(process.cwd(), "src/lib/commerce/kora.ts"),
  "utf8",
);

describe("marketplace commerce security", () => {
  it("enables RLS for every private commerce table and grants clients read-only access", () => {
    for (const table of [
      "orders",
      "order_items",
      "commerce_payments",
      "commerce_webhook_events",
      "seller_ledger_entries",
    ]) {
      expect(migration).toContain(
        `ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`,
      );
    }

    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.orders, public.order_items, public.commerce_payments",
    );
    expect(migration).toContain(
      "GRANT SELECT ON TABLE public.orders, public.order_items, public.commerce_payments",
    );
    expect(migration).not.toMatch(
      /GRANT (?:INSERT|UPDATE|DELETE)[^;]+(?:orders|commerce_payments|seller_ledger_entries)/,
    );
  });

  it("enforces exact buyer totals and full seller product-price entitlement", () => {
    expect(migration).toContain('"orders_delivery_total_exact"');
    expect(migration).toContain(
      '"orders"."delivery_total_minor" = "orders"."actual_delivery_cost_minor" + "orders"."platform_service_component_minor"',
    );
    expect(migration).toContain('"orders_buyer_total_exact"');
    expect(migration).toContain('"order_items_seller_gets_full_product_price"');
    expect(migration).toContain(
      '"order_items"."seller_entitlement_minor" = "order_items"."product_total_minor"',
    );
  });

  it("makes order financial snapshots, payment identity, order items, and ledger entries immutable", () => {
    expect(migration).toContain("Order identity and financial snapshots are immutable");
    expect(migration).toContain("Payment identity and amount are immutable");
    expect(migration).toContain("order_items_are_immutable");
    expect(migration).toContain("seller_ledger_entries_are_immutable");
    expect(migration).toContain("Commerce audit and entitlement records are append-only");
  });

  it("keeps order reads participant-scoped and webhook events admin-only", () => {
    expect(migration).toContain('"orders_select_buyer_or_admin"');
    expect(migration).toContain('"order_items_select_participant_or_admin"');
    expect(migration).toContain('"seller_ledger_entries_select_owner_or_admin"');
    expect(migration).toContain('"commerce_webhook_events_admin_read"');
  });

  it("uses a server-only Kora secret and verifies signed webhook data", () => {
    expect(koraSource).toContain('import "server-only"');
    expect(koraSource).toContain('process.env.KORA_SECRET_KEY');
    expect(koraSource).not.toContain("NEXT_PUBLIC_KORA");
    expect(koraSource).toContain('createHmac("sha256", KORA_SECRET_KEY)');
    expect(koraSource).toContain("timingSafeEqual");
  });

  it("publishes approved inventory from all sellers without a forced seller filter", () => {
    expect(catalogSource).toContain(
      'supabase.from("products").select("*", { count: "exact" }).eq("status", "APPROVED")',
    );
    expect(catalogSource).toContain(
      'if (search.seller) query = query.eq("seller_id", search.seller)',
    );
    expect(catalogSource).not.toMatch(
      /from\("products"\)[\s\S]{0,180}\.eq\("seller_id",\s*(?:principal|user|currentSeller)/,
    );
  });
});
