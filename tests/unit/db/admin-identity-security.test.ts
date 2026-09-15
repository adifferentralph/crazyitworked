import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "drizzle/0019_admin_identity_integrity.sql"),
  "utf8",
);

describe("admin identity integrity", () => {
  it("requires the authoritative ADMIN role before an admin profile can exist", () => {
    expect(migration).toContain("Admin profile requires an authoritative ADMIN role");
    expect(migration).toContain("CREATE TRIGGER admin_profiles_validate_role");
    expect(migration).toContain("role = 'ADMIN'::public.user_role");
  });

  it("prevents direct role changes that leave buyer, seller, or admin profile residue", () => {
    expect(migration).toContain("CREATE TRIGGER profiles_validate_role_change");
    expect(migration).toContain("FROM public.seller_profiles WHERE user_id = NEW.id");
    expect(migration).toContain("FROM public.buyer_profiles WHERE user_id = NEW.id");
    expect(migration).toContain("FROM public.admin_profiles WHERE user_id = NEW.id");
  });

  it("keeps admin provisioning owner-only and refuses accounts with marketplace activity", () => {
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.provision_admin_identity");
    expect(migration).toContain("Admin provisioning requires a fresh account");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated, service_role");
    expect(migration).toContain("admin.identity_provisioned");
  });
});
