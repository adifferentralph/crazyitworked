import { config as loadEnvironment } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

loadEnvironment({ path: ".env.local" });

const environment = z
  .object({ DATABASE_URL: z.string().url().startsWith("postgresql://") })
  .parse(process.env);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });

  try {
    const [result] = await sql<
      {
        admin_profiles_with_non_admin_role: number;
        admins_missing_admin_profile: number;
        admins_with_seller_profile: number;
        authoritative_admins: number;
      }[]
    >`
      select
        count(*) filter (where profiles.role = 'ADMIN')::int as authoritative_admins,
        count(*) filter (
          where profiles.role = 'ADMIN' and admin_profiles.user_id is null
        )::int as admins_missing_admin_profile,
        count(*) filter (
          where profiles.role = 'ADMIN' and seller_profiles.user_id is not null
        )::int as admins_with_seller_profile,
        count(*) filter (
          where admin_profiles.user_id is not null and profiles.role <> 'ADMIN'
        )::int as admin_profiles_with_non_admin_role
      from public.profiles
      left join public.admin_profiles on admin_profiles.user_id = profiles.id
      left join public.seller_profiles on seller_profiles.user_id = profiles.id
    `;

    assert(result, "Admin identity consistency query returned no result.");
    assert(
      result.admin_profiles_with_non_admin_role === 0,
      "An admin profile is attached to a non-admin authoritative role.",
    );
    assert(
      result.admins_missing_admin_profile === 0,
      "An authoritative admin is missing its permission profile.",
    );
    assert(
      result.admins_with_seller_profile === 0,
      "An authoritative admin still has a seller profile.",
    );

    console.log("Admin identity consistency passed:");
    console.log(`- ${result.authoritative_admins} authoritative admin identities`);
    console.log("- 0 role/profile mismatches");
    console.log("- 0 admin identities with seller-profile residue");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Admin identity consistency failed.");
  console.error(error instanceof Error ? error.message : "Unknown verification error");
  process.exitCode = 1;
});
