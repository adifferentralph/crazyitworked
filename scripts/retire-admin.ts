import { config as loadEnvironment } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

loadEnvironment({ path: ".env.local" });

const environment = z
  .object({ DATABASE_URL: z.string().url().startsWith("postgresql://") })
  .parse(process.env);

function getArgument(name: string) {
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

const emailSchema = z.string().trim().toLowerCase().email();
const retiredEmail = emailSchema.parse(getArgument("email"));
const replacementEmail = emailSchema.parse(getArgument("replacement-email"));

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function maskEmail(value: string) {
  const [localPart = "", domain = ""] = value.split("@");
  const visible = localPart.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(localPart.length - visible.length, 3))}@${domain}`;
}

type AdminIdentity = {
  adminRoleKey: string | null;
  email: string;
  hasBuyerProfile: boolean;
  hasSellerProfile: boolean;
  id: string;
  role: string;
  status: string;
};

async function main() {
  assert(retiredEmail !== replacementEmail, "The retiring and replacement accounts must differ.");
  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });

  try {
    await sql.begin(async (transaction) => {
      const identities = await transaction<AdminIdentity[]>`
        select
          profiles.id,
          lower(auth.users.email) as email,
          profiles.role::text as role,
          profiles.status::text as status,
          admin_roles.key::text as "adminRoleKey",
          (buyer_profiles.user_id is not null) as "hasBuyerProfile",
          (seller_profiles.user_id is not null) as "hasSellerProfile"
        from public.profiles
        join auth.users on auth.users.id = profiles.id
        left join public.admin_profiles on admin_profiles.user_id = profiles.id
        left join public.admin_roles on admin_roles.id = admin_profiles.admin_role_id
        left join public.buyer_profiles on buyer_profiles.user_id = profiles.id
        left join public.seller_profiles on seller_profiles.user_id = profiles.id
        where lower(auth.users.email) in (${retiredEmail}, ${replacementEmail})
        for update of profiles
      `;

      const retiring = identities.find((identity) => identity.email === retiredEmail);
      const replacement = identities.find(
        (identity) =>
          identity.email === replacementEmail &&
          identity.role === "ADMIN" &&
          identity.status === "ACTIVE" &&
          identity.adminRoleKey === "SUPER_ADMIN",
      );

      assert(retiring, "The account being retired does not exist.");
      assert(
        retiring.role === "ADMIN" && retiring.status === "ACTIVE",
        "The account being retired is not an active authoritative admin identity.",
      );
      assert(
        retiring.adminRoleKey === "SUPER_ADMIN",
        "The account being retired does not hold SUPER_ADMIN.",
      );
      assert(
        replacement,
        "A different ACTIVE SUPER_ADMIN replacement must be provisioned and verified first.",
      );
      assert(
        !(retiring.hasBuyerProfile && retiring.hasSellerProfile),
        "The retiring identity has both buyer and seller residue and requires manual review.",
      );

      const fallbackRole = retiring.hasSellerProfile ? "SELLER" : "BUYER";

      await transaction`
        delete from public.admin_profiles
        where user_id = ${retiring.id}
      `;

      if (!retiring.hasBuyerProfile && !retiring.hasSellerProfile) {
        await transaction`
          insert into public.buyer_profiles (user_id)
          values (${retiring.id})
          on conflict (user_id) do nothing
        `;
      }

      await transaction`
        update public.profiles
        set role = ${fallbackRole}::public.user_role,
            status = 'RESTRICTED'::public.account_status,
            updated_at = now()
        where id = ${retiring.id}
      `;

      await transaction`
        insert into public.audit_logs (
          actor_user_id,
          action,
          object_type,
          object_id,
          previous_value,
          new_value,
          reason,
          metadata
        )
        values (
          ${replacement.id},
          'admin.identity_retired',
          'profile',
          ${retiring.id},
          jsonb_build_object('role', 'ADMIN', 'admin_role', 'SUPER_ADMIN'),
          jsonb_build_object('role', ${fallbackRole}, 'status', 'RESTRICTED'),
          'Retired only after a different active SUPER_ADMIN was verified',
          jsonb_build_object('session_user', session_user)
        )
      `;

      const [verified] = await transaction<AdminIdentity[]>`
        select
          profiles.id,
          '' as email,
          profiles.role::text as role,
          profiles.status::text as status,
          admin_roles.key::text as "adminRoleKey",
          (buyer_profiles.user_id is not null) as "hasBuyerProfile",
          (seller_profiles.user_id is not null) as "hasSellerProfile"
        from public.profiles
        left join public.admin_profiles on admin_profiles.user_id = profiles.id
        left join public.admin_roles on admin_roles.id = admin_profiles.admin_role_id
        left join public.buyer_profiles on buyer_profiles.user_id = profiles.id
        left join public.seller_profiles on seller_profiles.user_id = profiles.id
        where profiles.id = ${retiring.id}
      `;

      assert(verified, "Retired identity verification returned no result.");
      assert(verified.role !== "ADMIN", "The retired identity still has the ADMIN role.");
      assert(verified.status === "RESTRICTED", "The retired identity was not restricted.");
      assert(verified.adminRoleKey === null, "The retired identity still has an admin role.");
    });

    console.log(`Admin identity retired: ${maskEmail(retiredEmail)}.`);
    console.log(`Verified replacement: ${maskEmail(replacementEmail)}.`);
    console.log("Revoke the retired user's Supabase Auth sessions before considering deletion.");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Admin retirement failed.");
  console.error(error instanceof Error ? error.message : "Unknown retirement error");
  process.exitCode = 1;
});