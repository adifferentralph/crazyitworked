import { AdminSearch, AdminStatus, AdminTable } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { SellerSubmitButton } from "@/components/seller/seller-submit-button";
import { formatAdminDate } from "@/lib/admin/format";
import { getAdminSellers } from "@/lib/admin/operations";
import { requireAdminPermission } from "@/lib/auth/permissions";

import { reviewSellerVerificationAction } from "./actions";

export default async function AdminSellersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; q?: string }>;
}) {
  await requireAdminPermission("sellers.manage", "/admin/sellers");
  const { error, message, q } = await searchParams;
  const sellers = await getAdminSellers(q);
  return (
    <AdminShell description="Seller identity, onboarding, location and catalogue activity from authoritative records." title="Sellers">
      {message ? (
        <p className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">
          {message === "approved" ? "Vendor verified." : "Vendor verification rejected."}
        </p>
      ) : null}
      {error ? (
        <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <AdminSearch defaultValue={q} placeholder="Search store or seller email" />
      <AdminTable columns={["Store", "Email", "Location", "Products", "Onboarding", "Account", "Verification", "Review"]} emptyMessage="No sellers match this search." rows={sellers.map((seller) => [
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
        </div>,
      ])} />
    </AdminShell>
  );
}
