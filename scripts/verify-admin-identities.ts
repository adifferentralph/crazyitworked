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
        adminProfilesWithNonAdminRole: number;
        adminsMissingAdminProfile: number;
        adminsWithBuyerProfile: number;
        adminsWithSellerProfile: number;
        authoritativeAdmins: number;
        missingSuperAdminPermissions: number;
        superAdmins: number;
      }[]
    >`
      select
        count(*) filter (where profiles.role = 'ADMIN')::int as "authoritativeAdmins",
        count(*) filter (
          where profiles.role = 'ADMIN' and admin_profiles.user_id is null
        )::int as "adminsMissingAdminProfile",
        count(*) filter (
          where profiles.role = 'ADMIN' and seller_profiles.user_id is not null
        )::int as "adminsWithSellerProfile",
        count(*) filter (
          where profiles.role = 'ADMIN' and buyer_profiles.user_id is not null
        )::int as "adminsWithBuyerProfile",
        count(*) filter (
          where profiles.role = 'ADMIN' and admin_roles.key = 'SUPER_ADMIN'
        )::int as "superAdmins",
        count(*) filter (
          where admin_profiles.user_id is not null and profiles.role <> 'ADMIN'
        )::int as "adminProfilesWithNonAdminRole",
        (
          select count(*)::int
          from public.permissions
          where not exists (
            select 1
            from public.admin_roles as super_admin_role
            join public.admin_role_permissions
              on admin_role_permissions.role_id = super_admin_role.id
            where super_admin_role.key = 'SUPER_ADMIN'
              and admin_role_permissions.permission_id = permissions.id
          )
        ) as "missingSuperAdminPermissions"
      from public.profiles
      left join public.admin_profiles on admin_profiles.user_id = profiles.id
      left join public.admin_roles on admin_roles.id = admin_profiles.admin_role_id
      left join public.buyer_profiles on buyer_profiles.user_id = profiles.id
      left join public.seller_profiles on seller_profiles.user_id = profiles.id
    `;

    assert(result, "Admin identity consistency query returned no result.");
    assert(
      result.adminProfilesWithNonAdminRole === 0,
      "An admin profile is attached to a non-admin authoritative role.",
    );
    assert(
      result.adminsMissingAdminProfile === 0,
      "An authoritative admin is missing its permission profile.",
    );
    assert(
      result.adminsWithSellerProfile === 0,
      "An authoritative admin still has a seller profile.",
    );
    assert(
      result.adminsWithBuyerProfile === 0,
      "An authoritative admin still has a buyer profile.",
    );
    assert(
      result.authoritativeAdmins === 0 || result.superAdmins > 0,
      "No authoritative SUPER_ADMIN identity exists.",
    );
    assert(
      result.missingSuperAdminPermissions === 0,
      "The SUPER_ADMIN role is missing one or more seeded permissions.",
    );

    console.log("Admin identity consistency passed:");
    console.log(`- ${result.authoritativeAdmins} authoritative admin identities`);
    console.log(`- ${result.superAdmins} active SUPER_ADMIN role assignments`);
    console.log("- 0 role/profile mismatches");
    console.log("- 0 admin identities with buyer/seller profile residue");
    console.log("- SUPER_ADMIN includes every seeded permission");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Admin identity consistency failed.");
  console.error(error instanceof Error ? error.message : "Unknown verification error");
  process.exitCode = 1;
});