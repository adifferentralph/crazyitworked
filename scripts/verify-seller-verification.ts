import { config } from "dotenv";
import postgres from "postgres";
import { z } from "zod";

config({ path: ".env.local" });

const environment = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
  })
  .parse(process.env);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isUnauthorizedReviewDenied(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  if (error.code === "42501") return true;

  return (
    error.code === "P0001" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.includes("Seller cannot set verification review outcomes")
  );
}

async function main() {
  const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false });

  try {
    const [seller] = await sql<{ id: string }[]>`
      select user_id as id
      from public.seller_profiles
      order by created_at
      limit 1
    `;
    assert(seller, "A seller identity is required for live verification testing.");

    const [superAdminPermission] = await sql<{ allowed: boolean }[]>`
      select exists (
        select 1
        from public.admin_roles
        join public.admin_role_permissions
          on admin_role_permissions.role_id = admin_roles.id
        join public.permissions
          on permissions.id = admin_role_permissions.permission_id
        where admin_roles.key = 'SUPER_ADMIN'
          and permissions.code = 'sellers.manage'
      ) as allowed
    `;
    assert(superAdminPermission?.allowed, "SUPER_ADMIN is missing sellers.manage.");

    const policies = await sql<{ policyname: string; with_check: string | null }[]>`
      select policyname, with_check
      from pg_policies
      where schemaname = 'public'
        and tablename = 'seller_verifications'
        and policyname in (
          'seller_verifications_insert_own',
          'seller_verifications_update_own'
        )
    `;
    assert(policies.length === 2, "Seller verification write policies are missing.");
    assert(
      policies.every((policy) =>
        policy.with_check?.includes("'SUBMITTED'::seller_verification_status"),
      ),
      "Seller verification policies do not preserve seller submission access.",
    );
    assert(
      policies.every((policy) =>
        !policy.with_check?.includes("'APPROVED'::seller_verification_status"),
      ),
      "Seller verification policies still allow seller approval.",
    );

    const rollback = new Error("seller-verification-rls-rollback");
    let approvalAttempted = false;
    let selfApprovalBlocked = false;
    try {
      await sql.begin(async (transaction) => {
        await transaction`
          insert into public.seller_verifications (
            seller_id,
            status,
            submitted_at,
            reviewed_at,
            reviewed_by,
            rejection_reason
          ) values (${seller.id}::uuid, 'DRAFT', null, null, null, null)
          on conflict (seller_id) do update set
            status = 'DRAFT',
            submitted_at = null,
            reviewed_at = null,
            reviewed_by = null,
            rejection_reason = null
        `;
        await transaction.unsafe("set local role authenticated");
        await transaction.unsafe("set local row_security = on");
        await transaction`
          select set_config(
            'request.jwt.claims',
            ${JSON.stringify({ role: "authenticated", sub: seller.id })},
            true
          )
        `;
        const [identity] = await transaction<{ id: string | null; role: string }[]>`
          select auth.uid()::text as id, current_user::text as role
        `;
        assert(
          identity?.id === seller.id && identity.role === "authenticated",
          "The RLS test could not assume the seller identity.",
        );

        approvalAttempted = true;
        const updated = await transaction<{ status: string }[]>`
          update public.seller_verifications
          set status = 'APPROVED'
          where seller_id = ${seller.id}::uuid
          returning status::text
        `;
        selfApprovalBlocked = updated.length === 0;
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback && approvalAttempted) {
        selfApprovalBlocked = isUnauthorizedReviewDenied(error);
      }
    }
    assert(selfApprovalBlocked, "A seller could still approve their own verification.");

    console.log("Seller verification database checks passed:");
    console.log("- SUPER_ADMIN owns sellers.manage");
    console.log("- seller verification submission remains available");
    console.log("- seller self-approval is rejected by live RLS");
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seller verification database checks failed.");
  console.error(error instanceof Error ? error.message : "Unknown verification error");
  process.exitCode = 1;
});
