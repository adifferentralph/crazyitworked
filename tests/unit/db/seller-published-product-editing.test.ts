import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "drizzle/0029_seller_published_product_editing.sql"),
  "utf8",
);
const sellerActions = readFileSync(
  resolve(process.cwd(), "src/app/(protected)/seller/actions.ts"),
  "utf8",
);

describe("seller published product editing", () => {
  it("allows owned live listings to be corrected without opening moderation states", () => {
    expect(migration).toContain("'DRAFT', 'NEEDS_CHANGES', 'APPROVED', 'OUT_OF_STOCK'");
    expect(migration).toContain("NEW.status = 'PENDING_REVIEW'");
    expect(migration).not.toContain("'SUSPENDED', 'FLAGGED'");
  });

  it("keeps readiness validation and seller ownership enforcement", () => {
    expect(migration).toContain("public.product_submission_ready(NEW.id, NEW.condition)");
    expect(migration).toContain("Seller ownership cannot be changed");
    expect(migration).toContain("products.seller_id = (SELECT auth.uid())");
    expect(sellerActions).toContain("canSellerEditProduct(existingProduct.status)");
    expect(sellerActions).toContain('status: "PENDING_REVIEW" as const');
  });
});
