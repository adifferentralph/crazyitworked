import { config } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

config({ path: ".env.local" });

const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
  })
  .parse(process.env);

const expectedTables = [
  "addresses",
  "admin_profiles",
  "admin_role_permissions",
  "admin_roles",
  "audit_logs",
  "buyer_profiles",
  "permissions",
  "profiles",
  "seller_profiles",
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });

  try {
    const migrations = await sql<{ count: number }[]>`
      select count(*)::int as count from drizzle.__drizzle_migrations
    `;
    assert((migrations[0]?.count ?? 0) >= 1, "Expected the Foundation migration to be applied.");

    const tables = await sql<{ rowsecurity: boolean; tablename: string }[]>`
      select tablename, rowsecurity
      from pg_tables
      where schemaname = 'public' and tablename in ${sql(expectedTables)}
      order by tablename
    `;
    assert(tables.length === expectedTables.length, "One or more Foundation tables are missing.");
    assert(
      tables.every((table) => table.rowsecurity),
      "RLS is not enabled on every table.",
    );

    const policies = await sql<{ count: number }[]>`
      select count(*)::int as count
      from pg_policies
      where schemaname = 'public' and tablename in ${sql(expectedTables)}
    `;
    assert(policies[0]?.count === 14, "Unexpected Foundation RLS policy count.");

    const anonymousGrants = await sql<{ count: number }[]>`
      select count(*)::int as count
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'anon'
        and table_name in ${sql(expectedTables)}
    `;
    assert(anonymousGrants[0]?.count === 0, "Anonymous table privileges were found.");

    const auditGrants = await sql<{ count: number }[]>`
      select count(*)::int as count
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'authenticated'
        and table_name = 'audit_logs'
    `;
    assert(auditGrants[0]?.count === 0, "Authenticated audit-log privileges were found.");

    const profileUpdateColumns = await sql<{ column_name: string }[]>`
      select column_name
      from information_schema.column_privileges
      where table_schema = 'public'
        and table_name = 'profiles'
        and grantee = 'authenticated'
        and privilege_type = 'UPDATE'
      order by column_name
    `;
    assert(
      profileUpdateColumns.map((column) => column.column_name).join(",") ===
        "avatar_url,full_name,phone",
      "Profile update grants expose protected columns.",
    );

    const triggers = await sql<{ trigger_name: string }[]>`
      select distinct trigger_name
      from information_schema.triggers
      where (event_object_schema = 'public' and event_object_table in ${sql(expectedTables)})
         or (event_object_schema = 'auth' and event_object_table = 'users')
    `;
    const triggerNames = new Set(triggers.map((trigger) => trigger.trigger_name));
    for (const trigger of [
      "on_auth_user_created",
      "on_auth_user_email_changed",
      "profiles_set_updated_at",
      "buyer_profiles_set_updated_at",
      "seller_profiles_set_updated_at",
      "admin_profiles_set_updated_at",
      "addresses_set_updated_at",
    ]) {
      assert(triggerNames.has(trigger), `Missing database trigger: ${trigger}`);
    }

    const foreignKeys = await sql<{ constraint_name: string }[]>`
      select tc.constraint_name
      from information_schema.table_constraints tc
      where tc.constraint_schema = 'public'
        and tc.constraint_type = 'FOREIGN KEY'
        and tc.table_name in ${sql(expectedTables)}
    `;
    assert(foreignKeys.length === 9, "Unexpected Foundation foreign-key count.");

    const [roleCount] = await sql<
      { count: number }[]
    >`select count(*)::int as count from public.admin_roles`;
    const [permissionCount] = await sql<{ count: number }[]>`
      select count(*)::int as count from public.permissions
    `;
    const [assignmentCount] = await sql<{ count: number }[]>`
      select count(*)::int as count from public.admin_role_permissions
    `;
    assert(roleCount?.count === 9, "Expected nine seeded admin roles.");
    assert(permissionCount?.count === 15, "Expected fifteen seeded permissions.");
    assert(assignmentCount?.count === 48, "Unexpected role-permission assignment count.");

    const functions = await sql<{ definition: string; proname: string }[]>`
      select p.proname, pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('handle_new_auth_user', 'handle_auth_user_email_changed', 'set_updated_at')
    `;
    assert(functions.length === 3, "Expected three Foundation trigger functions.");
    const signupFunction = functions.find((item) => item.proname === "handle_new_auth_user");
    assert(signupFunction, "Signup trigger function is missing.");
    assert(signupFunction.definition.includes("SELLER"), "Signup trigger lacks seller support.");
    assert(
      !signupFunction.definition.includes("THEN 'ADMIN'"),
      "Signup trigger permits client-assigned administrators.",
    );

    console.log("Foundation database verification passed:");
    console.log(`- ${tables.length} identity tables with RLS`);
    console.log(`- ${policies[0]?.count ?? 0} RLS policies`);
    console.log(`- ${triggers.length} required triggers`);
    console.log(`- ${foreignKeys.length} foreign-key constraints`);
    console.log(`- ${roleCount?.count ?? 0} roles, ${permissionCount?.count ?? 0} permissions`);
    console.log(`- ${assignmentCount?.count ?? 0} role-permission assignments`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Foundation database verification failed.");
  console.error(error instanceof Error ? error.message : "Unknown verification error");
  process.exitCode = 1;
});
