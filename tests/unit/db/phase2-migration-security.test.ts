import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "drizzle/0001_tense_eternity.sql"), "utf8");
const storageUploadMigration = readFileSync(
  resolve(process.cwd(), "drizzle/0006_storage_upload_ownership.sql"),
  "utf8",
);
const storageReadMigration = readFileSync(
  resolve(process.cwd(), "drizzle/0005_storage_owner_read.sql"),
  "utf8",
);
const hardeningMigration = readFileSync(
  resolve(process.cwd(), "drizzle/0002_sweet_franklin_storm.sql"),
  "utf8",
);

const privateTables = [
  "products",
  "product_images",
  "product_media_history",
  "inventory_transactions",
  "product_modification_history",
  "seller_verifications",
] as const;

describe("Phase 2 marketplace database security", () => {
  it.each(privateTables)("enables RLS for %s", (table) => {
    expect(migration).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
  });

  it("publishes only approved products", () => {
    expect(migration).toContain("products.status = 'APPROVED'");
    expect(migration).toContain('"products"."status" = \'APPROVED\'');
  });

  it("requires five labelled images and an actual-item image when necessary", () => {
    expect(migration).toContain("count(*) FILTER (WHERE is_active) >= 5");
    for (const type of ["PRIMARY", "ANGLE", "DETAIL", "PART_NUMBER", "PACKAGING"]) {
      expect(migration).toContain(`type = '${type}'`);
    }
    expect(migration).toContain("count(*) FILTER (WHERE is_active AND is_actual_item) >= 1");
  });

  it("keeps the product-media bucket private and seller paths ownership-scoped", () => {
    expect(migration).toContain("'product-media',\n  'product-media',\n  false");
    expect(migration).toContain("(SELECT auth.uid())::text = (storage.foldername(name))[1]");
    expect(migration).not.toMatch(/CREATE POLICY[^;]+ON storage\.objects[^;]+FOR DELETE/is);
  });

  it("lets an authenticated seller read the exact owner path returned after upload", () => {
    expect(storageReadMigration).toContain(
      'CREATE POLICY "product_media_select_owner"',
    );
    expect(storageReadMigration).toContain(
      '(SELECT auth.uid())::text = (storage.foldername(name))[1]',
    );
    expect(storageReadMigration).not.toMatch(/FOR (UPDATE|DELETE)/i);
  });

  it("checks upload ownership through a fixed-path security-definer function", () => {
    expect(storageUploadMigration).toContain("SECURITY DEFINER");
    expect(storageUploadMigration).toContain("SET search_path = ''");
    expect(storageUploadMigration).toContain("products.seller_id = (SELECT auth.uid())");
    expect(storageUploadMigration).toContain("products.status IN ('DRAFT', 'NEEDS_CHANGES')");
    expect(storageUploadMigration).toContain("public.seller_can_upload_product_media(name)");
  });

  it("makes original media metadata immutable for non-admin users", () => {
    expect(migration).toContain("RAISE EXCEPTION 'Original product media is immutable'");
    expect(migration).toContain("NEW.storage_path IS DISTINCT FROM OLD.storage_path");
    expect(migration).toContain("NEW.source IS DISTINCT FROM OLD.source");
  });

  it("forces direct client product inserts to start as onboarded private drafts", () => {
    expect(hardeningMigration).toContain('"products"."status" = \'DRAFT\'');
    expect(hardeningMigration).toContain('"products"."published_at" is null');
    expect(hardeningMigration).toContain("onboarding_completed_at is not null");
  });

  it("does not let sellers mislabel original uploads as admin media", () => {
    expect(hardeningMigration).toContain('"product_images"."source" = \'SELLER_ORIGINAL\'');
  });
});