import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "drizzle/0030_silky_annihilus.sql"),
  "utf8",
);

describe("catalog delivery fees", () => {
  it("stores nonnegative listing and order-item delivery fees", () => {
    expect(migration).toContain('"products" ADD COLUMN "delivery_fee_minor"');
    expect(migration).toContain('"order_items" ADD COLUMN "delivery_fee_minor"');
    expect(migration).toContain('"products_delivery_fee_nonnegative"');
    expect(migration).toContain('"order_items_delivery_fee_nonnegative"');
  });

  it("requires a delivery destination and protects it as an immutable order snapshot", () => {
    expect(migration).toContain('"orders_delivery_has_destination"');
    expect(migration).toContain("NEW.delivery_address_line_1 IS DISTINCT FROM OLD.delivery_address_line_1");
    expect(migration).toContain("NEW.delivery_phone IS DISTINCT FROM OLD.delivery_phone");
  });
});
