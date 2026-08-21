import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "drizzle/0008_typical_peter_parker.sql"), "utf8");

describe("RFQ database security and workflow", () => {
  it("enables RLS and revokes default access on every private RFQ table", () => {
    for (const table of [
      "seller_categories",
      "part_requests",
      "seller_request_matches",
      "part_request_quotes",
      "part_request_images",
      "part_request_events",
    ]) {
      expect(migration).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      expect(migration).toContain(`REVOKE ALL ON TABLE public.${table} FROM anon, authenticated`);
    }
    expect(migration).not.toMatch(/GRANT .* TO anon/);
  });

  it("routes only to active verified sellers with matching categories", () => {
    expect(migration).toContain("seller_profiles.status = 'ACTIVE'");
    expect(migration).toContain("seller_verifications.status = 'APPROVED'");
    expect(migration).toContain("FROM public.seller_categories");
    expect(migration).toContain("ON CONFLICT (request_id, seller_id) DO NOTHING");
  });

  it("keeps submitted request details immutable and validates transitions", () => {
    expect(migration).toContain("Submitted part request details are immutable");
    expect(migration).toContain("Invalid part request status transition");
    expect(migration).toContain("OLD.status = 'DRAFT' AND NEW.status = 'OPEN'");
    expect(migration).toContain("Part request ownership cannot change");
  });

  it("accepts quotes atomically only for the owning buyer", () => {
    expect(migration).toContain("target_buyer_id IS DISTINCT FROM auth.uid()");
    expect(migration).toContain("THEN 'ACCEPTED'::public.part_quote_status ELSE 'REJECTED'");
    expect(migration).toContain("FOR UPDATE OF quotes, requests");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.accept_part_request_quote(uuid) TO authenticated");
  });

  it("uses a private request bucket with owner and matched-seller policies", () => {
    expect(migration).toContain("'request-media',\n  'request-media',\n  false");
    expect(migration).toContain('(storage.foldername(name))[1] = (SELECT auth.uid())::text');
    expect(migration).toContain("part_requests.status IN ('DRAFT', 'OPEN')");
    expect(migration).toContain("seller_request_matches.seller_id = (SELECT auth.uid())");
  });

  it("does not reference elevated Supabase client credentials", () => {
    expect(migration).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE/);
  });
});