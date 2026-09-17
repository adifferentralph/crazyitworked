import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "drizzle/0019_admin_identity_integrity.sql"),
  "utf8",
);
const provisionScript = readFileSync(resolve(process.cwd(), "scripts/create-admin.ts"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

describe("owner-only super admin provisioning", () => {
  it("removes commerce-role profiles before creating the authoritative admin profile", () => {
    expect(migration).toContain(
      "DELETE FROM public.seller_profiles WHERE user_id = target_user_id",
    );
    expect(migration).toContain("DELETE FROM public.buyer_profiles WHERE user_id = target_user_id");
    expect(migration).toContain("UPDATE public.profiles\n  SET role = 'ADMIN'");
    expect(migration).toContain("VALUES (target_user_id, target_admin_role_id");
  });

  it("uses an owner CLI email argument without creating or printing a password", () => {
    expect(packageJson.scripts["admin:create"]).toBe("tsx scripts/create-admin.ts");
    expect(provisionScript).toContain("--email=");
    expect(provisionScript).toContain("provision_admin_identity");
    expect(provisionScript).not.toMatch(/password\s*:/i);
    expect(provisionScript).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("has no public admin signup route", () => {
    expect(existsSync(resolve(process.cwd(), "src/app/(auth)/signup/admin"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "src/app/signup/admin"))).toBe(false);
  });
});
