import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "drizzle/0018_seller_onboarding_contract.sql"),
  "utf8",
);

describe("seller onboarding database contract", () => {
  it("requires operational contact and location fields while keeping CAC and description optional", () => {
    for (const field of ["store_name", "contact_phone", "country", "state", "city"]) {
      expect(migration).toContain(`nullif(btrim(NEW.${field}), '') IS NULL`);
    }

    expect(migration).not.toContain("btrim(NEW.business_registration_number)");
    expect(migration).not.toContain("btrim(NEW.description)");
  });

  it("retains protected identity fields and completion rollback guards", () => {
    expect(migration).toContain("NEW.status IS DISTINCT FROM OLD.status");
    expect(migration).toContain("NEW.slug IS DISTINCT FROM OLD.slug");
    expect(migration).toContain("Seller onboarding completion cannot be reversed");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.validate_seller_profile_write() FROM PUBLIC, anon, authenticated",
    );
  });
});
