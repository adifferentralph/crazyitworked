import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "drizzle/0027_automatic_product_publishing.sql"),
  "utf8",
);
const sellerActions = readFileSync(
  resolve(process.cwd(), "src/app/(protected)/seller/actions.ts"),
  "utf8",
);
const adminActions = readFileSync(
  resolve(process.cwd(), "src/app/(protected)/admin/products/actions.ts"),
  "utf8",
);

describe("automatic product publishing", () => {
  it("publishes only after the existing database readiness checks", () => {
    expect(migration).toContain("public.product_submission_ready(NEW.id, NEW.condition)");
    expect(migration).toContain("NEW.status = 'PENDING_REVIEW'");
    expect(migration).toContain("THEN 'APPROVED' ELSE 'OUT_OF_STOCK'");
    expect(migration).toContain("NEW.published_at = coalesce(NEW.published_at, now())");
    expect(sellerActions).toContain('? "published" : "draft-created"');
  });

  it("uses reversible admin moderation with permission checks and audit records", () => {
    expect(adminActions).toContain('requireAdminPermission("products.edit"');
    expect(adminActions).toContain('"SUSPENDED"');
    expect(adminActions).toContain('"PENDING_REVIEW"');
    expect(adminActions).toContain('"PRODUCT_UNPUBLISHED_BY_ADMIN"');
    expect(adminActions).toContain("transaction.insert(auditLogs)");
    expect(adminActions).not.toContain(".delete(products)");
  });
});
