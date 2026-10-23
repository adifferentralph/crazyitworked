import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const rlsMigration = readFileSync(
  resolve(process.cwd(), "drizzle/0032_ambiguous_captain_america.sql"),
  "utf8",
);
const publicVisibilityMigration = readFileSync(
  resolve(process.cwd(), "drizzle/0033_public_marvel_apes.sql"),
  "utf8",
);
const visibilityFunctionMigration = readFileSync(
  resolve(process.cwd(), "drizzle/0034_sour_magdalene.sql"),
  "utf8",
);
const reviewAction = readFileSync(
  resolve(process.cwd(), "src/app/(protected)/admin/sellers/actions.ts"),
  "utf8",
);

describe("seller verification controls", () => {
  it("prevents sellers from writing administrator review outcomes", () => {
    expect(rlsMigration).toContain("status\" in ('DRAFT', 'SUBMITTED')");
    expect(rlsMigration).toContain('"reviewed_by" is null');
    expect(rlsMigration).toContain('"rejection_reason" is null');
  });

  it("removes rejected or restricted sellers from direct public product reads", () => {
    expect(publicVisibilityMigration).toContain('TO anon USING');
    expect(publicVisibilityMigration).toContain(
      "status in ('PENDING_VERIFICATION', 'ACTIVE')",
    );
    expect(visibilityFunctionMigration).toContain("SECURITY DEFINER");
    expect(visibilityFunctionMigration).toContain(
      "GRANT EXECUTE ON FUNCTION public.seller_is_marketplace_visible(uuid) TO anon, authenticated",
    );
    expect(visibilityFunctionMigration).toContain(
      'public.seller_is_marketplace_visible("products"."seller_id")',
    );
  });

  it("requires seller-management permission and audits each review", () => {
    expect(reviewAction).toContain('requireAdminPermission("sellers.manage"');
    expect(reviewAction).toContain("database.transaction");
    expect(reviewAction).toContain("SELLER_VERIFICATION_APPROVED");
    expect(reviewAction).toContain("SELLER_VERIFICATION_REJECTED");
  });
});
