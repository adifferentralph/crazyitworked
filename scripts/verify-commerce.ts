import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

config({ path: ".env.local" });

const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
    KORA_SECRET_KEY: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().min(20).optional(),
    ),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  })
  .parse(process.env);

const commerceTables = [
  "orders",
  "order_items",
  "commerce_payments",
  "commerce_webhook_events",
  "seller_ledger_entries",
] as const;

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
    const tables = await sql<{ relname: string; relrowsecurity: boolean }[]>`
      select relname, relrowsecurity
      from pg_class
      join pg_namespace on pg_namespace.oid = pg_class.relnamespace
      where pg_namespace.nspname = 'public'
        and pg_class.relkind = 'r'
        and relname in ${sql(commerceTables)}
    `;
    assert(tables.length === commerceTables.length, "A commerce table is missing.");
    assert(
      tables.every((table) => table.relrowsecurity),
      "RLS must be enabled on every commerce table.",
    );

    const policies = await sql<{ cmd: string; policyname: string; tablename: string }[]>`
      select tablename, policyname, cmd
      from pg_policies
      where schemaname = 'public' and tablename in ${sql(commerceTables)}
    `;
    assert(policies.length === 5, `Expected five commerce policies, found ${policies.length}.`);
    assert(
      policies.every((policy) => policy.cmd === "SELECT"),
      "Commerce client policies must remain read-only.",
    );

    const grants = await sql<{ grantee: string; privilege_type: string; table_name: string }[]>`
      select grantee, table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ${sql(commerceTables)}
        and grantee in ('anon', 'authenticated')
    `;
    assert(
      grants.length === commerceTables.length &&
        grants.every(
          (grant) => grant.grantee === "authenticated" && grant.privilege_type === "SELECT",
        ),
      "Commerce tables must expose authenticated SELECT only.",
    );

    const requiredConstraints = [
      "orders_delivery_total_exact",
      "orders_buyer_total_exact",
      "orders_pickup_has_no_delivery_charge",
      "orders_delivery_has_destination",
      "order_items_product_total_exact",
      "order_items_delivery_fee_nonnegative",
      "order_items_seller_gets_full_product_price",
      "products_delivery_fee_nonnegative",
    ];
    const constraints = await sql<{ constraint_name: string }[]>`
      select constraint_name
      from information_schema.table_constraints
      where constraint_schema = 'public'
        and constraint_name in ${sql(requiredConstraints)}
    `;
    assert(
      constraints.length === requiredConstraints.length,
      "A commerce financial or idempotency constraint is missing.",
    );

    const deliveryColumns = await sql<{ column_name: string; table_name: string }[]>`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and (
          (table_name = 'products' and column_name = 'delivery_fee_minor')
          or (table_name = 'order_items' and column_name = 'delivery_fee_minor')
          or (table_name = 'orders' and column_name in (
            'delivery_recipient_name', 'delivery_phone', 'delivery_address_line_1',
            'delivery_address_line_2', 'delivery_city', 'delivery_state'
          ))
        )
    `;
    assert(deliveryColumns.length === 8, "A delivery fee or destination column is missing.");

    const requiredIndexes = [
      "commerce_payments_provider_reference_unique",
      "commerce_payments_idempotency_key_unique",
      "commerce_webhook_events_payload_hash_unique",
      "seller_ledger_entries_idempotency_key_unique",
    ];
    const indexes = await sql<{ indexname: string }[]>`
      select indexname from pg_indexes
      where schemaname = 'public' and indexname in ${sql(requiredIndexes)}
    `;
    assert(indexes.length === requiredIndexes.length, "A commerce idempotency index is missing.");

    const requiredTriggers = [
      "orders_set_updated_at",
      "orders_protect_financial_snapshot",
      "commerce_payments_set_updated_at",
      "commerce_payments_protect_identity",
      "order_items_are_immutable",
      "seller_ledger_entries_are_immutable",
    ];
    const triggers = await sql<{ trigger_name: string }[]>`
      select distinct trigger_name
      from information_schema.triggers
      where trigger_schema = 'public'
        and trigger_name in ${sql(requiredTriggers)}
    `;
    assert(
      triggers.length === requiredTriggers.length,
      "A commerce immutability or timestamp trigger is missing.",
    );

    const [publicationParity] = await sql<
      { missing_from_marketplace: number; unexpected_marketplace_sellers: number }[]
    >`
      select
        (
          select count(*)::int
          from (
            select distinct seller_id from public.products where status = 'APPROVED'
            except
            select seller_id from public.marketplace_sellers
          ) missing
        ) as missing_from_marketplace,
        (
          select count(*)::int
          from (
            select seller_id from public.marketplace_sellers
            except
            select distinct seller_id from public.products where status = 'APPROVED'
          ) unexpected
        ) as unexpected_marketplace_sellers
    `;
    assert(
      publicationParity?.missing_from_marketplace === 0 &&
        publicationParity.unexpected_marketplace_sellers === 0,
      "Approved seller inventory and the public marketplace seller view diverged.",
    );

    const [counts] = await sql<
      { approved_products: number; approved_sellers: number; pending_products: number }[]
    >`
      select
        count(*) filter (where status = 'APPROVED')::int as approved_products,
        count(distinct seller_id) filter (where status = 'APPROVED')::int as approved_sellers,
        count(*) filter (where status = 'PENDING_REVIEW')::int as pending_products
      from public.products
    `;

    const [buyer] = await sql<{ id: string }[]>`
      select buyer_profiles.user_id as id
      from public.buyer_profiles
      left join public.cart_items on cart_items.buyer_id = buyer_profiles.user_id
      group by buyer_profiles.user_id
      order by count(cart_items.id) desc
      limit 1
    `;
    assert(buyer, "A buyer identity is required for authenticated marketplace verification.");

    const [expectedMarketplace] = await sql<{ product_count: number }[]>`
      select count(products.id)::int as product_count
      from public.products
      join public.seller_profiles on seller_profiles.user_id = products.seller_id
      where products.status = 'APPROVED'
        and seller_profiles.status in ('PENDING_VERIFICATION', 'ACTIVE')
    `;

    let authenticatedMarketplaceCount = 0;
    let authenticatedCartCount = 0;
    let authenticatedVisibleCartCount = 0;
    await sql.begin(async (transaction) => {
      await transaction.unsafe("set local role authenticated");
      await transaction.unsafe("set local row_security = on");
      await transaction`
        select set_config(
          'request.jwt.claims',
          ${JSON.stringify({ role: "authenticated", sub: buyer.id })},
          true
        )
      `;

      const [marketplace] = await transaction<{ product_count: number }[]>`
        select count(*)::int as product_count
        from public.products
        where status = 'APPROVED'
      `;
      authenticatedMarketplaceCount = marketplace?.product_count ?? 0;

      const [cart] = await transaction<{ cart_count: number; visible_count: number }[]>`
        select
          count(cart_items.id)::int as cart_count,
          count(products.id)::int as visible_count
        from public.cart_items
        left join public.products
          on products.id = cart_items.product_id
          and products.status = 'APPROVED'
        where cart_items.buyer_id = ${buyer.id}::uuid
      `;
      authenticatedCartCount = cart?.cart_count ?? 0;
      authenticatedVisibleCartCount = cart?.visible_count ?? 0;
    });

    assert(
      authenticatedMarketplaceCount === (expectedMarketplace?.product_count ?? 0),
      "Authenticated buyers cannot see the same eligible marketplace inventory as guests.",
    );
    assert(
      authenticatedVisibleCartCount <= authenticatedCartCount,
      "Authenticated cart visibility returned an impossible count.",
    );

    const anonymousOrders = await anonymous.from("orders").select("id").limit(1);
    assert(
      anonymousOrders.error,
      "Anonymous direct database access unexpectedly read private orders.",
    );

    const { data: publicProducts, error: publicProductsError } = await anonymous
      .from("products")
      .select("id,status,seller_id")
      .limit(1000);
    assert(!publicProductsError, "Anonymous approved-product read failed.");
    assert(
      (publicProducts ?? []).every((product) => product.status === "APPROVED"),
      "Anonymous marketplace access exposed a non-approved listing.",
    );

    console.log("Commerce database verification passed:");
    console.log(`- ${tables.length} commerce tables with RLS`);
    console.log("- authenticated clients have SELECT-only participant-scoped policies");
    console.log("- anonymous direct order access rejected by PostgreSQL privileges/RLS");
    console.log(
      "- exact total, seller entitlement, idempotency, and immutability controls present",
    );
    console.log(
      `- marketplace: ${counts?.approved_products ?? 0} approved products across ${counts?.approved_sellers ?? 0} sellers; ${counts?.pending_products ?? 0} pending review`,
    );
    console.log(
      `- authenticated buyer: ${authenticatedMarketplaceCount} marketplace products; ${authenticatedVisibleCartCount}/${authenticatedCartCount} cart lines currently visible`,
    );
    console.log(`- Kora secret: ${environment.KORA_SECRET_KEY ? "configured" : "not configured"}`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Commerce database verification failed.");
  console.error(error instanceof Error ? error.message : "Unknown verification error");
  process.exitCode = 1;
});
