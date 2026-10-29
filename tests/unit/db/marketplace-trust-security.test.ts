import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "drizzle/0036_giant_johnny_storm.sql"), "utf8");
const moderationAction = readFileSync(resolve(process.cwd(), "src/app/(protected)/admin/reports/actions.ts"), "utf8");
const sellerAction = readFileSync(resolve(process.cwd(), "src/app/(protected)/admin/sellers/actions.ts"), "utf8");
const adminOperations = readFileSync(resolve(process.cwd(), "src/lib/admin/operations.ts"), "utf8");

describe("marketplace trust and seller recognition contracts", () => {
  it("fixes the admin seller aggregate without an outer group by", () => {
    const sellerQuery = adminOperations.slice(
      adminOperations.indexOf("export async function getAdminSellers"),
      adminOperations.indexOf("export type AdminMarketplaceReport"),
    );
    expect(sellerQuery).toContain("left join lateral");
    expect(sellerQuery).toContain("count(*)::int as product_count");
    expect(sellerQuery).toContain("coalesce(product_counts.product_count, 0)");
    expect(sellerQuery).not.toContain("group by");
  });

  it("keeps reports private, rate limited and idempotent", () => {
    expect(migration).toContain("marketplace_reports_insert_own");
    expect(migration).toContain("marketplace_reports_reporter_pending_target_unique");
    expect(migration).toContain("Marketplace report rate limit exceeded");
    expect(migration).toContain("trust_score_events_idempotency_unique");
    expect(moderationAction).toContain("onConflictDoNothing");
    expect(moderationAction).toContain("report.status !== \"PENDING\"");
  });

  it("requires the authoritative superuser role for manual verification and revocation", () => {
    expect(sellerAction).toContain("requireSuperAdmin");
    expect(sellerAction).toContain("MANUAL_INSPECTION");
    expect(sellerAction).toContain("manualSellerVerificationEvents");
    expect(migration).toContain("manual_seller_verification_events_immutable");
  });

  it("assigns at most twenty deterministic founding positions without reusing revoked slots", () => {
    expect(migration).toContain("row_number() OVER");
    expect(migration).toContain("founding_position <= 20");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("max(position)");
    expect(migration).toContain("founding_merchant_awards_position_unique");
  });
});
