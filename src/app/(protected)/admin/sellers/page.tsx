import { AdminSearch, AdminStatus, AdminTable } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { SellerSubmitButton } from "@/components/seller/seller-submit-button";
import { formatAdminDate } from "@/lib/admin/format";
import { getAdminSellers } from "@/lib/admin/operations";
import { hasSuperAdminRole, requireAdminPermission } from "@/lib/auth/permissions";

import {
  manageManualSellerVerificationAction,
  reviewSellerVerificationAction,
  revokeFoundingMerchantAction,
} from "./actions";

export default async function AdminSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; q?: string }>;
}) {
  const principal = await requireAdminPermission("sellers.manage", "/admin/sellers");
  const superAdmin = await hasSuperAdminRole(principal.id);
  const { error, message, q } = await searchParams;
  const sellers = await getAdminSellers(q);
  return (
    <AdminShell description="Seller identity, onboarding, location and catalogue activity from authoritative records." title="Sellers">
      {message ? (
        <p className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
          {{
            approved: "Vendor onboarding approved.",
            "founding-revoked": "Founding 20 badge revoked.",
            "manually-verified": "Seller independently verified after manual inspection.",
            rejected: "Vendor verification rejected.",
            "verification-revoked": "Manual seller verification revoked.",
          }[message] ?? "Seller record updated."}
        </p>
      ) : null}
      {error ? (
        <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <AdminSearch defaultValue={q} placeholder="Search store or seller email" />
      <AdminTable columns={["Store", "Email", "Location", "Products", "Onboarding", "Account", "Verification", "Recognition", "Review"]} emptyMessage="No sellers match this search." rows={sellers.map((seller) => [
        <span className="font-semibold text-stone-950" key="store">{seller.storeName}</span>,
        seller.email,
        [seller.city, seller.state].filter(Boolean).join(", ") || "Not provided",
        seller.productCount,
        formatAdminDate(seller.onboardingCompletedAt, "Incomplete"),
        <AdminStatus key="status" value={seller.status} />,
        <div className="space-y-1" key="verification">
          <AdminStatus value={seller.verificationStatus} />
          {seller.reviewedAt ? <p className="text-xs text-stone-500">{formatAdminDate(seller.reviewedAt)}</p> : null}
          {seller.rejectionReason ? <p className="max-w-52 text-xs text-red-700">{seller.rejectionReason}</p> : null}
        </div>,
        <div className="min-w-40 space-y-1 text-xs" key="recognition">
          <p className="font-semibold text-stone-800">Manual: {seller.manualVerificationStatus?.replaceAll("_", " ").toLowerCase() ?? "not verified"}</p>
          {seller.foundingPosition ? (
            <p className={seller.foundingRevokedAt ? "text-stone-500 line-through" : "font-semibold text-amber-800"}>
              Founding 20 · #{seller.foundingPosition}
            </p>
          ) : <p className="text-stone-500">No founding badge</p>}
          {seller.foundingAwardedAt ? <p className="text-stone-500">Awarded {formatAdminDate(seller.foundingAwardedAt)}</p> : null}
        </div>,
        <div className="flex min-w-56 flex-col gap-2" key="actions">
          <form action={reviewSellerVerificationAction}>
            <input name="sellerId" type="hidden" value={seller.sellerId} />
            <input name="reason" type="hidden" value="" />
            <SellerSubmitButton className="w-full" name="action" pendingLabel="Verifying..." size="sm" value="approve">
              Verify vendor
            </SellerSubmitButton>
          </form>
          <form action={reviewSellerVerificationAction} className="flex gap-2">
            <input name="sellerId" type="hidden" value={seller.sellerId} />
            <label className="sr-only" htmlFor={`rejection-reason-${seller.sellerId}`}>Reason for rejection</label>
            <input
              className="h-9 min-w-0 flex-1 rounded-md border border-stone-300 px-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-red-100"
              id={`rejection-reason-${seller.sellerId}`}
              maxLength={500}
              minLength={5}
              name="reason"
              placeholder="Reason for rejection"
              required
            />
            <SellerSubmitButton name="action" pendingLabel="Saving..." size="sm" type="submit" value="reject" variant="outline">
              Reject
            </SellerSubmitButton>
          </form>
          {superAdmin ? (
            <details className="rounded-md border border-stone-200 p-2 text-xs">
              <summary className="cursor-pointer font-bold text-stone-800">Superuser trust actions</summary>
              {seller.manualVerificationStatus === "VERIFIED" ? (
                <form action={manageManualSellerVerificationAction} className="mt-3 grid gap-2">
                  <input name="sellerId" type="hidden" value={seller.sellerId} />
                  <input name="action" type="hidden" value="revoke" />
                  <input name="notes" type="hidden" value="" />
                  <input className="h-9 rounded-md border border-stone-300 px-2" minLength={5} name="reason" placeholder="Required revocation reason" required />
                  <SellerSubmitButton pendingLabel="Revoking..." size="sm" variant="outline">Revoke verification</SellerSubmitButton>
                </form>
              ) : (
                <form action={manageManualSellerVerificationAction} className="mt-3 grid gap-2">
                  <input name="sellerId" type="hidden" value={seller.sellerId} />
                  <input name="action" type="hidden" value="verify" />
                  <input name="reason" type="hidden" value="" />
                  <textarea className="min-h-20 rounded-md border border-stone-300 p-2" minLength={5} name="notes" placeholder="Inspection notes" required />
                  <label className="flex items-start gap-2 leading-5">
                    <input className="mt-1" name="confirmed" required type="checkbox" value="yes" />
                    I personally inspected this business and assessed its legitimacy.
                  </label>
                  <SellerSubmitButton pendingLabel="Verifying..." size="sm">Verify Seller</SellerSubmitButton>
                </form>
              )}
              {seller.foundingPosition && !seller.foundingRevokedAt ? (
                <form action={revokeFoundingMerchantAction} className="mt-3 grid gap-2 border-t border-stone-200 pt-3">
                  <input name="sellerId" type="hidden" value={seller.sellerId} />
                  <input className="h-9 rounded-md border border-stone-300 px-2" minLength={5} name="reason" placeholder="Required founding badge reason" required />
                  <SellerSubmitButton pendingLabel="Revoking..." size="sm" variant="outline">Revoke Founding 20</SellerSubmitButton>
                </form>
              ) : null}
            </details>
          ) : null}
        </div>,
      ])} />
    </AdminShell>
  );
}
