import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "drizzle/0007_curved_shadowcat.sql"), "utf8");

describe("professional buyer commerce security", () => {
  it("enables RLS and scopes every buyer commerce table to auth.uid", () => {
    for (const table of ["saved_vehicles", "saved_parts", "cart_items"]) {
      expect(migration).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`(select auth.uid()) = "${table}"."buyer_id"`);
      expect(migration).toContain(`REVOKE ALL ON TABLE public.${table} FROM anon, authenticated`);
    }
  });

  it("checks approved live stock for direct cart writes", () => {
    expect(migration).toContain("status = 'APPROVED'");
    expect(migration).toContain("quantity - reserved_quantity >= \"cart_items\".\"quantity\"");
    expect(migration).toContain('CONSTRAINT "cart_items_quantity_positive"');
  });

  it("keeps role assignment immutable while allow-listing buyer account type metadata", () => {
    expect(migration).toContain("WHEN upper(coalesce(NEW.raw_user_meta_data ->> 'requested_role', '')) = 'SELLER'");
    expect(migration).toContain("WHEN 'FLEET_OPERATOR' THEN 'FLEET_OPERATOR'::public.buyer_account_type");
    expect(migration).toContain("ELSE 'INDIVIDUAL'::public.buyer_account_type");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.handle_new_auth_user()");
  });

  it("does not grant anonymous access or elevated mutations", () => {
    expect(migration).not.toMatch(/GRANT .* TO anon/);
    expect(migration).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE/);
  });
});