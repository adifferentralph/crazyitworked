import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "drizzle/0024_optional_fields_primary_fitment.sql"),
  "utf8",
);

describe("product primary fitment submission contract", () => {
  it("backfills one primary fitment for existing products", () => {
    expect(migration).toContain("WITH first_active_fitment AS");
    expect(migration).toContain("SET is_primary = true");
    expect(migration).toContain("NOT EXISTS");
  });

  it("requires an active primary fitment before marketplace review", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.product_submission_ready");
    expect(migration).toContain("AND is_primary = true");
    expect(migration).toContain("CREATE TRIGGER products_require_primary_fitment");
    expect(migration).toContain("Choose at least one primary vehicle fitment before submitting");
  });

  it("keeps the trigger function unavailable to client roles", () => {
    expect(migration).toContain("FROM PUBLIC, anon, authenticated, service_role");
  });
});
