import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("drizzle/0015_oauth_seller_role_resolution.sql"),
  "utf8",
);

describe("OAuth seller role finalization migration", () => {
  it("requires a recent matching OAuth identity and a pristine buyer placeholder", () => {
    expect(migration).toMatch(/auth\.identities/i);
    expect(migration).toMatch(/interval '30 minutes'/i);
    expect(migration).toMatch(/current_profile\.role <> 'BUYER'/i);
    expect(migration).toMatch(/public\.part_requests/i);
  });

  it("does not expose the owner-only role conversion helper to API roles", () => {
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.finalize_new_oauth_seller\(uuid, text\)[\s\S]*authenticated/i,
    );
    expect(migration).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.finalize_new_oauth_seller/i,
    );
  });

  it("audits successful role conversion without permitting admin assignment", () => {
    expect(migration).toMatch(/oauth\.seller_profile_created/i);
    expect(migration).not.toMatch(/'ADMIN'::public\.user_role/i);
  });
});
