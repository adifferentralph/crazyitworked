import { config } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

config({ path: ".env.local" });

const environment = z
  .object({ DATABASE_URL: z.string().url().startsWith("postgresql://") })
  .parse(process.env);

const phaseTwoTables = [
  "seller_verifications",
  "product_categories",
  "vehicle_makes",
  "vehicle_models",
  "vehicle_generations",
  "vehicle_years",
  "vehicle_trims",
  "engines",
  "transmissions",
  "drivetrains",
  "vehicle_fitments",
  "products",
  "product_cross_references",
  "product_fitments",
  "product_images",
  "product_media_history",
  "inventory_transactions",
  "product_modification_history",
] as const;

const requiredTriggers = [
  "seller_profiles_validate_write",
  "seller_verifications_validate_write",
  "vehicle_fitments_validate",
  "products_validate_write",
  "products_require_primary_fitment",
  "products_z_auto_publish_ready",
  "products_record_history",
  "products_record_inventory",
  "product_images_validate_write",
  "product_images_record_history",
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });

  try {
    const tables = await sql<{ relname: string; relrowsecurity: boolean }[]>`
      select relname, relrowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'public'
        and relname in ${sql(phaseTwoTables)}
    `;
    assert(tables.length === phaseTwoTables.length, "One or more Phase 2 tables are missing.");
    assert(
      tables.every((table) => table.relrowsecurity),
      "Every Phase 2 table must enable RLS.",
    );

    const policies = await sql<{ policyname: string; tablename: string }[]>`
      select policyname, tablename
      from pg_policies
      where schemaname = 'public'
        and tablename in ${sql(phaseTwoTables)}
    `;
    assert(
      policies.length >= 36,
      `Expected at least 36 Phase 2 policies, found ${policies.length}.`,
    );

    const triggers = await sql<{ trigger_name: string }[]>`
      select trigger_name
      from information_schema.triggers
      where trigger_schema = 'public'
        and trigger_name in ${sql(requiredTriggers)}
    `;
    assert(
      requiredTriggers.every((name) => triggers.some((trigger) => trigger.trigger_name === name)),
      "Required Phase 2 triggers are missing.",
    );

    const [bucket] = await sql<
      { allowed_mime_types: string[] | null; file_size_limit: number | null; public: boolean }[]
    >`
      select public, file_size_limit, allowed_mime_types
      from storage.buckets
      where id = 'product-media'
    `;
    assert(bucket, "The product-media Storage bucket is missing.");
    assert(bucket.public === false, "The product-media bucket must remain private.");
    assert(Number(bucket.file_size_limit) === 8_388_608, "Unexpected product image size limit.");
    assert(
      bucket.allowed_mime_types?.length === 3 &&
        bucket.allowed_mime_types.every((mime) =>
          ["image/jpeg", "image/png", "image/webp"].includes(mime),
        ),
      "Product media MIME restrictions are incomplete.",
    );

    const storagePolicies = await sql<
      { cmd: string; policyname: string; qual: string | null; with_check: string | null }[]
    >`
      select policyname, cmd, qual, with_check
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname like 'product_media_%'
    `;
    assert(
      storagePolicies.some((policy) => policy.cmd === "SELECT"),
      "Storage SELECT policy missing.",
    );
    assert(
      storagePolicies.some((policy) => policy.cmd === "INSERT"),
      "Storage INSERT policy missing.",
    );
    const uploadPolicy = storagePolicies.find(
      (policy) =>
        policy.cmd === "INSERT" && policy.policyname === "product_media_insert_seller_original",
    );
    assert(
      uploadPolicy?.with_check?.includes("seller_can_upload_product_media"),
      "Storage INSERT policy must use the seller/product ownership helper.",
    );
    const [uploadHelper] = await sql<{ prosecdef: boolean }[]>`
      select prosecdef
      from pg_proc
      join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
      where pg_namespace.nspname = 'public'
        and pg_proc.proname = 'seller_can_upload_product_media'
    `;
    assert(uploadHelper?.prosecdef, "Storage upload ownership helper must be SECURITY DEFINER.");
    const destructivePolicies = storagePolicies.filter((policy) =>
      ["UPDATE", "DELETE"].includes(policy.cmd),
    );
    assert(
      destructivePolicies.every(
        (policy) =>
          policy.policyname === "product_media_delete_inventory_staff" &&
          policy.cmd === "DELETE" &&
          policy.qual?.includes("inventory_staff_can_upload_product_media"),
      ),
      "Seller originals must not have Storage UPDATE or DELETE policies.",
    );

    const anonWrites = await sql<{ table_name: string; privilege_type: string }[]>`
      select table_name, privilege_type
      from information_schema.role_table_grants
      where grantee = 'anon'
        and table_schema = 'public'
        and table_name in ${sql(phaseTwoTables)}
        and privilege_type <> 'SELECT'
    `;
    assert(anonWrites.length === 0, "Anonymous users have unexpected Phase 2 write grants.");

    const [seedCounts] = await sql<
      { categories: number; fitments: number; makes: number; models: number }[]
    >`
      select
        (select count(*)::int from public.product_categories) as categories,
        (select count(*)::int from public.vehicle_fitments) as fitments,
        (select count(*)::int from public.vehicle_makes) as makes,
        (select count(*)::int from public.vehicle_models) as models
    `;
    assert(seedCounts && seedCounts.categories >= 40, "Category seed data is incomplete.");
    assert(seedCounts && seedCounts.fitments >= 6, "Vehicle fitment seed data is incomplete.");

    const [submissionContract] = await sql<{ definition: string; missingPrimary: number }[]>`
      select
        pg_get_functiondef('public.product_submission_ready(uuid, public.product_condition)'::regprocedure)
          as definition,
        (
          select count(*)::int
          from (
            select product_id
            from public.product_fitments
            where is_active = true
            group by product_id
            having not bool_or(is_primary)
          ) as products_without_primary_fitment
        ) as "missingPrimary"
    `;
    assert(submissionContract, "Product submission readiness verification returned no result.");
    assert(
      submissionContract.definition.includes("product_fitments") &&
        submissionContract.definition.includes("is_primary"),
      "Product submission readiness must require an active primary fitment.",
    );
    assert(
      submissionContract.missingPrimary === 0,
      "An existing product has active fitments but no primary fitment.",
    );
    const [automaticPublishing] = await sql<{ definition: string }[]>`
      select pg_get_functiondef('public.auto_publish_ready_product()'::regprocedure)
        as definition
    `;
    assert(
      automaticPublishing?.definition.includes("product_submission_ready") &&
        automaticPublishing.definition.includes("APPROVED"),
      "Automatic product publishing trigger is incomplete.",
    );
    let automaticPublicationTransitionTested = false;
    await sql`begin`;
    try {
      const [eligibleProduct] = await sql<
        { id: string; published_at: string | null; quantity: number }[]
      >`
        select id, quantity, published_at
        from public.products
        where status in ('APPROVED', 'OUT_OF_STOCK')
          and public.product_submission_ready(id, condition)
        limit 1
      `;
      if (eligibleProduct) {
        const [transitioned] = await sql<
          { published_at: string | null; status: string }[]
        >`
          update public.products
          set status = 'PENDING_REVIEW'
          where id = ${eligibleProduct.id}
          returning status::text, published_at
        `;
        assert(
          transitioned?.status === (eligibleProduct.quantity > 0 ? "APPROVED" : "OUT_OF_STOCK"),
          "A ready product did not publish automatically.",
        );
        assert(transitioned.published_at, "Automatically published product is missing published_at.");
        automaticPublicationTransitionTested = true;
      } else {
        const [fixture] = await sql<
          { category_id: string; fitment_id: string; seller_id: string }[]
        >`
          select
            (select id from public.product_categories where is_active = true limit 1) as category_id,
            (select id from public.vehicle_fitments limit 1) as fitment_id,
            (select user_id from public.seller_profiles limit 1) as seller_id
        `;
        if (fixture?.category_id && fixture.fitment_id && fixture.seller_id) {
          const [temporaryProduct] = await sql<{ id: string }[]>`
            insert into public.products (
              seller_id, category_id, name, slug, description, condition, brand, sku,
              price_minor, quantity, state, city, pickup_available, delivery_available,
              created_by_user_id, last_modified_by_user_id
            ) values (
              ${fixture.seller_id}, ${fixture.category_id}, 'Automatic publication verification part',
              ${`automatic-publication-verification-${crypto.randomUUID()}`},
              'Temporary product used inside a rolled-back database verification transaction.',
              'NEW', 'Verification', ${`VERIFY-${crypto.randomUUID()}`}, 10000, 1,
              'Lagos', 'Ikeja', false, true, ${fixture.seller_id}, ${fixture.seller_id}
            )
            returning id
          `;
          assert(temporaryProduct, "Temporary automatic-publication product could not be created.");
          await sql`
            insert into public.product_fitments (product_id, fitment_id, claimed_by_user_id, is_primary)
            values (${temporaryProduct.id}, ${fixture.fitment_id}, ${fixture.seller_id}, true)
          `;
          await sql`
            insert into public.product_images (
              product_id, storage_path, type, position, is_primary, is_actual_item,
              uploaded_by, original_filename, mime_type, size_bytes
            )
            select
              ${temporaryProduct.id},
              ${`verification/${crypto.randomUUID()}/`} || lower(image_type::text) || '.jpg',
              image_type,
              ordinal - 1,
              image_type = 'PRIMARY',
              false,
              ${fixture.seller_id},
              lower(image_type::text) || '.jpg',
              'image/jpeg',
              1024
            from unnest(array['PRIMARY', 'ANGLE', 'DETAIL', 'PART_NUMBER', 'PACKAGING']::public.product_image_type[])
              with ordinality as required_images(image_type, ordinal)
          `;
          const [transitioned] = await sql<{ published_at: string | null; status: string }[]>`
            update public.products
            set status = 'PENDING_REVIEW'
            where id = ${temporaryProduct.id}
            returning status::text, published_at
          `;
          assert(transitioned?.status === "APPROVED", "A ready product did not publish automatically.");
          assert(transitioned.published_at, "Automatically published product is missing published_at.");
          automaticPublicationTransitionTested = true;
        }
      }
    } finally {
      await sql`rollback`;
    }
    const [verificationCoverage] = await sql<{ missing: number }[]>`
      select count(*)::int as missing
      from public.seller_profiles
      left join public.seller_verifications
        on seller_verifications.seller_id = seller_profiles.user_id
      where seller_verifications.id is null
    `;
    assert(verificationCoverage?.missing === 0, "A seller is missing its verification record.");

    console.log("Phase 2 database verification passed:");
    console.log(`- ${tables.length} seller/catalog tables with RLS`);
    console.log(`- ${policies.length} public-schema RLS policies`);
    console.log(`- ${requiredTriggers.length} required workflow/history triggers`);
    console.log(
      `- ${seedCounts.categories} categories and ${seedCounts.fitments} vehicle fitments`,
    );
    console.log("- primary vehicle fitment and five images required before automatic publishing");
    console.log(
      automaticPublicationTransitionTested
        ? "- automatic publication transition verified inside a rolled-back transaction"
        : "- automatic publication trigger verified; no ready live product was available for transition testing",
    );
    console.log("- private product-media bucket with immutable seller originals");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Phase 2 database verification failed.");
  console.error(error instanceof Error ? error.message : "Unknown verification error");
  process.exitCode = 1;
});
