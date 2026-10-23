import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "drizzle/0031_overconfident_killmonger.sql"),
  "utf8",
);

describe("marketplace search visibility", () => {
  it("keeps published products searchable while seller verification is pending", () => {
    expect(migration).toContain(
      "seller_profiles.status in ('PENDING_VERIFICATION', 'ACTIVE')",
    );
    expect(migration).not.toContain("seller_profiles.status = 'ACTIVE'");
  });

  it("preserves anonymous read grants after replacing the public views", () => {
    expect(migration).toContain(
      "GRANT SELECT ON public.marketplace_product_search TO anon, authenticated",
    );
    expect(migration).toContain(
      "GRANT SELECT ON public.marketplace_sellers TO anon, authenticated",
    );
  });
});
