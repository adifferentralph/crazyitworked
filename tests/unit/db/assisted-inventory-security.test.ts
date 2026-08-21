import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("drizzle/0009_conscious_scarecrow.sql"), "utf8");

describe("assisted inventory database boundary", () => {
  it("requires a dedicated non-financial permission", () => {
    expect(migration).toContain("public.has_permission('assist_seller_inventory')");
    expect(migration).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE/);
  });

  it("keeps seller ownership and creation provenance immutable", () => {
    expect(migration).toContain("Product ownership and provenance are immutable");
    expect(migration).toContain("created_by_user_id");
    expect(migration).toContain("last_modified_by_user_id");
    expect(migration).toContain("PLATFORM_ASSISTED");
    expect(migration).toContain("BULK_IMPORT");
  });

  it("requires seller confirmation and five images before review", () => {
    expect(migration).toContain("Seller confirmation is required before assisted listing submission");
    expect(migration).toContain("public.product_submission_ready");
    expect(migration).toContain("Five required product images are needed before confirmation");
  });

  it("limits staff uploads to seller-owned assisted draft paths", () => {
    expect(migration).toContain("p.seller_id::text = (storage.foldername(object_name))[1]");
    expect(migration).toContain("p.id::text = (storage.foldername(object_name))[2]");
    expect(migration).toContain("p.creation_source <> 'SELLER'");
  });

  it("preserves import history and rejects silent duplicate files", () => {
    expect(migration).toContain("inventory_import_rows_import_row_unique");
    expect(migration).toContain("inventory_imports_seller_hash_unique");
    expect(migration).toContain("inventory_import_rows_product_when_imported");
  });
});