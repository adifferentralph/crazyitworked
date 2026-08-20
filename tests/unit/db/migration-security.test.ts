import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "drizzle/0000_silent_skin.sql"), "utf8");

const identityTables = [
  "addresses",
  "admin_profiles",
  "admin_role_permissions",
  "admin_roles",
  "audit_logs",
  "buyer_profiles",
  "permissions",
  "profiles",
  "seller_profiles",
] as const;

describe("identity migration security", () => {
  it.each(identityTables)("enables RLS for %s", (table) => {
    expect(migration).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
  });

  it.each(identityTables)("revokes default client privileges from %s", (table) => {
    expect(migration).toContain(`REVOKE ALL ON TABLE public.${table} FROM anon, authenticated`);
  });

  it("does not grant client access to audit logs", () => {
    expect(migration).not.toMatch(/GRANT .*public\.audit_logs TO (?:anon|authenticated)/);
  });

  it("does not let signup metadata assign the ADMIN role", () => {
    expect(migration).toContain("THEN 'SELLER'::public.user_role");
    expect(migration).toContain("ELSE 'BUYER'::public.user_role");
    expect(migration).not.toContain("THEN 'ADMIN'::public.user_role");
  });

  it("creates auth profile and email synchronization triggers", () => {
    expect(migration).toContain("CREATE TRIGGER on_auth_user_created");
    expect(migration).toContain("CREATE TRIGGER on_auth_user_email_changed");
  });
});
