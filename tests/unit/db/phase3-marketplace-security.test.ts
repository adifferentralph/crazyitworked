import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const sellerView = readFileSync(resolve(process.cwd(), "drizzle/0003_ambiguous_colossus.sql"), "utf8");
const searchView = readFileSync(resolve(process.cwd(), "drizzle/0004_small_thor_girl.sql"), "utf8");

describe("Phase 3 public marketplace views", () => {
  it("exposes sellers only through an approved-product boundary", () => {
    expect(sellerView).toContain("where products.status = 'APPROVED'");
    expect(sellerView).toContain("security_barrier = true");
    expect(sellerView).not.toContain("business_registration_number");
    expect(sellerView).not.toContain("contact_phone");
  });

  it("searches only approved products across automotive and part identifiers", () => {
    expect(searchView).toContain("where products.status = 'APPROVED'");
    for (const field of [
      "oem_part_number",
      "manufacturer_part_number",
      "reference_number",
      "vehicle_makes.name",
      "vehicle_models.name",
      "vehicle_years.year",
      "vehicle_trims.name",
      "engines.name",
    ]) expect(searchView).toContain(field);
  });

  it("grants anonymous users read-only view access", () => {
    expect(sellerView).toContain("REVOKE ALL ON public.marketplace_sellers");
    expect(sellerView).toContain("GRANT SELECT ON public.marketplace_sellers TO anon, authenticated");
    expect(searchView).toContain("REVOKE ALL ON public.marketplace_product_search");
    expect(searchView).toContain("GRANT SELECT ON public.marketplace_product_search TO anon, authenticated");
    expect(`${sellerView}\n${searchView}`).not.toMatch(/GRANT (?:INSERT|UPDATE|DELETE)/);
  });
});
