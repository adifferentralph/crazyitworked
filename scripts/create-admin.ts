import { config as loadEnvironment } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

loadEnvironment({ path: ".env.local" });

const environment = z
  .object({ DATABASE_URL: z.string().url().startsWith("postgresql://") })
  .parse(process.env);

const emailArgument = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--email="))
  ?.slice("--email=".length);

const email = z
  .string({ required_error: "Pass the confirmed auth account as --email=user@example.com." })
  .trim()
  .toLowerCase()
  .email("Pass a valid email address with --email=.")
  .parse(emailArgument ?? process.env.ADMIN_EMAIL);

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
  emailConfirmedAt: Date | null;
  hasBuyerProfile: boolean;
  hasSellerProfile: boolean;
  id: string;
  role: string;
  status: string;
};

async function main() {
  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });

  try {
    const result = await sql.begin(async (transaction) => {
      const [candidate] = await transaction<AdminIdentity[]>`
        select
          auth_users.id,
          auth_users.email_confirmed_at as "emailConfirmedAt",
          profiles.role::text as role,
          profiles.status::text as status,
          admin_roles.key::text as "adminRoleKey",
          (buyer_profiles.user_id is not null) as "hasBuyerProfile",
          (seller_profiles.user_id is not null) as "hasSellerProfile"
        from auth.users as auth_users
        join public.profiles on profiles.id = auth_users.id
        left join public.admin_profiles on admin_profiles.user_id = profiles.id
        left join public.admin_roles on admin_roles.id = admin_profiles.admin_role_id
        left join public.buyer_profiles on buyer_profiles.user_id = profiles.id
        left join public.seller_profiles on seller_profiles.user_id = profiles.id
        where lower(auth_users.email) = ${email}
        for update of profiles
      `;

      assert(
        candidate,
        "Create the authentication account and complete email confirmation before provisioning admin access.",
      );
      assert(
        candidate.emailConfirmedAt,
        "The authentication account must confirm its email before admin access is provisioned.",
      );

      const alreadyProvisioned =
        candidate.role === "ADMIN" &&
        candidate.status === "ACTIVE" &&
        candidate.adminRoleKey === "SUPER_ADMIN" &&
        !candidate.hasBuyerProfile &&
        !candidate.hasSellerProfile;

      if (!alreadyProvisioned) {
        await transaction`
          select public.provision_admin_identity(
            ${email},
            'SUPER_ADMIN'::public.admin_role_key
          )
        `;
      }

      const [verified] = await transaction<AdminIdentity[]>`
        select
          auth_users.id,
          auth_users.email_confirmed_at as "emailConfirmedAt",
          profiles.role::text as role,
          profiles.status::text as status,
          admin_roles.key::text as "adminRoleKey",
          (buyer_profiles.user_id is not null) as "hasBuyerProfile",
          (seller_profiles.user_id is not null) as "hasSellerProfile"
        from auth.users as auth_users
        join public.profiles on profiles.id = auth_users.id
        join public.admin_profiles on admin_profiles.user_id = profiles.id
        join public.admin_roles on admin_roles.id = admin_profiles.admin_role_id
        left join public.buyer_profiles on buyer_profiles.user_id = profiles.id
        left join public.seller_profiles on seller_profiles.user_id = profiles.id
        where auth_users.id = ${candidate.id}
      `;

      assert(verified, "Admin identity verification returned no result.");
      assert(verified.role === "ADMIN", "Authoritative ADMIN role was not applied.");
      assert(verified.status === "ACTIVE", "Admin account is not active.");
      assert(verified.adminRoleKey === "SUPER_ADMIN", "SUPER_ADMIN permission role was not applied.");
      assert(!verified.hasBuyerProfile, "Admin identity still has a buyer profile.");
      assert(!verified.hasSellerProfile, "Admin identity still has a seller profile.");

      return { alreadyProvisioned, id: verified.id };
    });

    console.log(
      result.alreadyProvisioned
        ? `Admin identity already verified for ${maskEmail(email)}.`
        : `Admin identity provisioned and verified for ${maskEmail(email)}.`,
    );
    console.log(`Identity: ${result.id}`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Admin provisioning failed.");
  console.error(error instanceof Error ? error.message : "Unknown provisioning error");
  process.exitCode = 1;
});