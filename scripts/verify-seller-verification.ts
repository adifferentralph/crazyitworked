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

    const [reportPermission] = await sql<{ allowed: boolean }[]>`
      select exists (
        select 1
        from public.admin_roles
        join public.admin_role_permissions on admin_role_permissions.role_id = admin_roles.id
        join public.permissions on permissions.id = admin_role_permissions.permission_id
        where admin_roles.key = 'SUPER_ADMIN' and permissions.code = 'reports.manage'
      ) as allowed
    `;
    assert(reportPermission?.allowed, "SUPER_ADMIN is missing reports.manage.");

    const adminSellerRows = await sql<{ product_count: number; seller_id: string }[]>`
      select
        seller_profiles.user_id as seller_id,
        coalesce(product_counts.product_count, 0)::int as product_count
      from public.seller_profiles
      left join lateral (
        select count(*)::int as product_count
        from public.products
        where products.seller_id = seller_profiles.user_id
      ) product_counts on true
      order by seller_profiles.created_at desc
      limit 100
    `;
    assert(adminSellerRows.length > 0, "The admin seller listing returned no sellers.");
    assert(
      new Set(adminSellerRows.map((row) => row.seller_id)).size === adminSellerRows.length,
      "The admin seller listing returned duplicate sellers.",
    );
    assert(adminSellerRows.every((row) => row.product_count >= 0), "A seller product count is invalid.");

    const [trustCoverage] = await sql<{ missing: number }[]>`
      select count(*)::int as missing
      from public.products
      left join public.product_trust_scores on product_trust_scores.product_id = products.id
      where product_trust_scores.product_id is null
    `;
    assert(trustCoverage?.missing === 0, "Some products are missing their initial trust score.");

    const [foundingIntegrity] = await sql<{ awards: number; positions: number }[]>`
      select count(*)::int as awards, count(distinct position)::int as positions
      from public.founding_merchant_awards
    `;
    assert((foundingIntegrity?.awards ?? 0) <= 20, "More than 20 founding merchant awards exist.");
    assert(foundingIntegrity?.awards === foundingIntegrity?.positions, "Founding merchant positions are duplicated.");

    const reportPolicies = await sql<{ policyname: string }[]>`
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'marketplace_reports'
      order by policyname
    `;
    assert(
      reportPolicies.some((policy) => policy.policyname === "marketplace_reports_insert_own") &&
        reportPolicies.some((policy) => policy.policyname === "marketplace_reports_select_own"),
      "Marketplace report owner RLS policies are missing.",
    );

    const manualVerificationPolicies = await sql<{ count: number }[]>`
      select count(*)::int as count
      from pg_policies
      where schemaname = 'public' and tablename in (
        'manual_seller_verifications',
        'manual_seller_verification_events'
      )
    `;
    assert(manualVerificationPolicies[0]?.count === 0, "Manual seller verification has a public RLS policy.");

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
    console.log("- SUPER_ADMIN owns reports.manage");
    console.log("- admin seller aggregate returns unique sellers and valid product counts");
    console.log("- every product has a database-backed initial trust score");
    console.log("- Founding 20 positions are unique and capped");
    console.log("- report and manual-verification RLS boundaries are present");
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
