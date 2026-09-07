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
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(40),
    VAPID_PRIVATE_KEY: z.string().min(20),
    VAPID_SUBJECT: z.string().regex(/^(mailto:|https:\/\/)/),
  })
  .parse(process.env);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function verifyOwnerReadIsolation(sql: postgres.Sql, identities: Array<{ id: string }>) {
  if (identities.length < 2) {
    throw new Error("Two active development identities are required for live RLS verification.");
  }

  const rollback = new Error("notification-rls-rollback");
  let verified = false;

  try {
    await sql.begin(async (transaction) => {
      const first = identities[0];
      const second = identities[1];
      if (!first || !second) throw new Error("Identity selection failed.");

      const suffix = Date.now().toString(36);
      const firstKey = "verify:first:" + suffix;
      const secondKey = "verify:second:" + suffix;
      const inserted = await transaction<{ id: string; user_id: string }[]>`
        insert into public.notifications (user_id, kind, title, body, destination, dedupe_key)
        values
          (${first.id}::uuid, 'SYSTEM', 'RLS check', 'First identity notification', '/', ${firstKey}),
          (${second.id}::uuid, 'SYSTEM', 'RLS check', 'Second identity notification', '/', ${secondKey})
        returning id, user_id
      `;
      assert(inserted.length === 2, "Could not create rollback-only RLS fixtures.");

      await transaction.unsafe("set local role authenticated");
      await transaction`
        select set_config(
          'request.jwt.claims',
          ${JSON.stringify({ role: "authenticated", sub: first.id })},
          true
        )
      `;

      const visible = await transaction<{ user_id: string }[]>`
        select user_id from public.notifications
        where dedupe_key in (${firstKey}, ${secondKey})
      `;
      assert(
        visible.length === 1 && visible[0]?.user_id === first.id,
        "Authenticated notification reads crossed user ownership.",
      );

      const ownId = inserted.find((row) => row.user_id === first.id)?.id;
      assert(ownId, "Own notification fixture is missing.");
      const updated = await transaction<{ id: string }[]>`
        update public.notifications
        set read_at = now()
        where id = ${ownId}::uuid
        returning id
      `;
      assert(updated.length === 1, "Authenticated owner could not mark a notification read.");

      verified = true;
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }

  assert(verified, "Notification owner-isolation transaction did not complete.");
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
        and relname in ('notifications', 'push_subscriptions')
    `;
    assert(tables.length === 2, "A notification table is missing.");
    assert(
      tables.every((table) => table.relrowsecurity),
      "Notification RLS is not fully enabled.",
    );

    const policies = await sql<{ policyname: string }[]>`
      select policyname from pg_policies
      where schemaname = 'public'
        and tablename in ('notifications', 'push_subscriptions')
    `;
    const policyNames = new Set(policies.map((policy) => policy.policyname));
    for (const policy of [
      "notifications_mark_own_read",
      "notifications_select_own",
      "push_subscriptions_delete_own",
      "push_subscriptions_select_own",
    ]) {
      assert(policyNames.has(policy), "Missing RLS policy: " + policy);
    }

    const tableGrants = await sql<
      { grantee: string; privilege_type: string; table_name: string }[]
    >`
      select grantee, privilege_type, table_name
      from information_schema.role_table_grants
      where table_schema = 'public'
        and table_name in ('notifications', 'push_subscriptions')
        and grantee in ('anon', 'authenticated')
    `;
    assert(
      tableGrants.length === 1 &&
        tableGrants[0]?.grantee === "authenticated" &&
        tableGrants[0]?.table_name === "notifications" &&
        tableGrants[0]?.privilege_type === "SELECT",
      "Notification table-level client grants are broader than authenticated SELECT.",
    );

    const updateColumns = await sql<{ column_name: string }[]>`
      select column_name
      from information_schema.column_privileges
      where table_schema = 'public'
        and table_name = 'notifications'
        and grantee = 'authenticated'
        and privilege_type = 'UPDATE'
    `;
    assert(
      updateColumns.length === 1 && updateColumns[0]?.column_name === "read_at",
      "Notification UPDATE access is not restricted to read_at.",
    );

    const triggers = await sql<{ trigger_name: string }[]>`
      select distinct trigger_name
      from information_schema.triggers
      where trigger_schema = 'public'
        and trigger_name in (
          'notifications_protect_fields',
          'push_subscriptions_protect_identity',
          'push_subscriptions_set_updated_at'
        )
    `;
    assert(triggers.length === 3, "A notification immutability/timestamp trigger is missing.");

    const anonymousNotifications = await anonymous.from("notifications").select("id").limit(1);
    const anonymousSubscriptions = await anonymous.from("push_subscriptions").select("id").limit(1);
    assert(anonymousNotifications.error, "Anonymous notification reads unexpectedly succeeded.");
    assert(
      anonymousSubscriptions.error,
      "Anonymous push-subscription reads unexpectedly succeeded.",
    );

    const identities = await sql<{ id: string }[]>`
      select id from public.profiles
      where status = 'ACTIVE' and role in ('BUYER', 'SELLER')
      order by created_at
      limit 2
    `;
    await verifyOwnerReadIsolation(sql, identities);

    console.log("Push notification database verification passed:");
    console.log("- two private tables with RLS and ownership policies");
    console.log("- authenticated users can only SELECT own notifications and update read_at");
    console.log("- browser subscription records have no direct client table privileges");
    console.log("- anonymous REST reads rejected");
    console.log(
      "- live cross-user notification read isolation verified in a rolled-back transaction",
    );
    console.log("- VAPID public/private/subject values are configured (values not printed)");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Push notification database verification failed.");
  console.error(error instanceof Error ? error.message : "Unknown verification error");
  process.exitCode = 1;
});
