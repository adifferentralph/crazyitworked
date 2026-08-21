import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

config({ path: ".env.local" });

const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  })
  .parse(process.env);

const marketplaceViews = ["marketplace_product_search", "marketplace_sellers"] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });
  const anonymous = createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const [migrationCount] = await sql<{ count: number }[]>`
      select count(*)::int as count from drizzle.__drizzle_migrations
    `;
    assert((migrationCount?.count ?? 0) >= 7, "Expected all Phase 3 migrations to be applied.");

    const views = await sql<{ relname: string; security_barrier: boolean }[]>`
      select
        pg_class.relname,
        coalesce('security_barrier=true' = any(pg_class.reloptions), false) as security_barrier
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'public'
        and pg_class.relkind = 'v'
        and pg_class.relname in ${sql(marketplaceViews)}
    `;
    assert(views.length === marketplaceViews.length, "One or more marketplace views are missing.");
    assert(views.every((view) => view.security_barrier), "Marketplace views must use security barriers.");

    const definitions = await sql<{ definition: string; viewname: string }[]>`
      select viewname, definition
      from pg_views
      where schemaname = 'public' and viewname in ${sql(marketplaceViews)}
    `;
    assert(
      definitions.every((view) => view.definition.includes("'APPROVED'")),
      "Every public marketplace view must restrict rows to APPROVED products.",
    );

    const sellerColumns = await sql<{ column_name: string }[]>`
      select column_name
      from information_schema.columns
      where table_schema = 'public' and table_name = 'marketplace_sellers'
      order by ordinal_position
    `;
    assert(
      sellerColumns.map((column) => column.column_name).join(",") ===
        "seller_id,store_name,slug,seller_status,verification_status,country,state,city",
      "The public seller view exposes unexpected columns.",
    );

    const viewGrants = await sql<{ grantee: string; privilege_type: string; table_name: string }[]>`
      select grantee, table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ${sql(marketplaceViews)}
        and grantee in ('anon', 'authenticated')
    `;
    for (const view of marketplaceViews) {
      for (const role of ["anon", "authenticated"] as const) {
        const grants = viewGrants.filter((grant) => grant.table_name === view && grant.grantee === role);
        assert(
          grants.length === 1 && grants[0]?.privilege_type === "SELECT",
          `${role} must have SELECT-only access to ${view}.`,
        );
      }
    }

    const anonWrites = await sql<{ count: number }[]>`
      select count(*)::int as count
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'anon'
        and table_name in (
          'products', 'product_images', 'product_cross_references', 'product_fitments',
          'marketplace_product_search', 'marketplace_sellers'
        )
        and privilege_type <> 'SELECT'
    `;
    assert(anonWrites[0]?.count === 0, "Anonymous marketplace write privileges were found.");

    const storagePolicy = await sql<{ qual: string | null }[]>`
      select qual
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'product_media_select_approved'
        and cmd = 'SELECT'
        and 'anon' = any(roles)
    `;
    assert(
      storagePolicy[0]?.qual?.includes("APPROVED"),
      "Anonymous product media access is not restricted to approved listings.",
    );

    const { data: products, error: productsError } = await anonymous
      .from("products")
      .select("id,status")
      .limit(1000);
    assert(!productsError, `Anonymous product read failed: ${productsError?.message}`);
    assert(
      (products ?? []).every((product) => product.status === "APPROVED"),
      "Anonymous access exposed a non-approved product.",
    );

    const [{ error: categoriesError }, { error: searchError }, { error: sellersError }] =
      await Promise.all([
        anonymous.from("product_categories").select("id").limit(1),
        anonymous.from("marketplace_product_search").select("product_id").limit(1),
        anonymous.from("marketplace_sellers").select("seller_id,store_name").limit(1),
      ]);
    assert(!categoriesError, `Anonymous category read failed: ${categoriesError?.message}`);
    assert(!searchError, `Anonymous search-view read failed: ${searchError?.message}`);
    assert(!sellersError, `Anonymous seller-view read failed: ${sellersError?.message}`);

    console.log("Phase 3 database verification passed:");
    console.log(`- ${views.length} approved-only security-barrier views`);
    console.log("- safe public seller projection with SELECT-only view grants");
    console.log(`- ${products?.length ?? 0} anonymously visible products, all approved`);
    console.log("- anonymous catalog/search access verified through Supabase REST");
    console.log("- anonymous product-media access remains approved-listing-only");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Phase 3 database verification failed.");
  console.error(error instanceof Error ? error.message : "Unknown verification error");
  process.exitCode = 1;
});