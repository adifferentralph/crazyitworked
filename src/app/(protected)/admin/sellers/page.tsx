import { AdminSearch, AdminStatus, AdminTable } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/lib/auth/principal";
import { getAdminSellers } from "@/lib/admin/operations";

export default async function AdminSellersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["ADMIN"], "/admin/sellers");
  const { q } = await searchParams;
  const sellers = await getAdminSellers(q);
  return (
    <AdminShell description="Seller identity, onboarding, location and catalogue activity from authoritative records." title="Sellers">
      <AdminSearch defaultValue={q} placeholder="Search store or seller email" />
      <AdminTable columns={["Store", "Email", "Location", "Products", "Onboarding", "Status"]} emptyMessage="No sellers match this search." rows={sellers.map((seller) => [
        <span className="font-semibold text-stone-950" key="store">{seller.storeName}</span>,
        seller.email,
        [seller.city, seller.state].filter(Boolean).join(", ") || "Not provided",
        seller.productCount,
        seller.onboardingCompletedAt ? seller.onboardingCompletedAt.toLocaleDateString("en-NG") : "Incomplete",
        <AdminStatus key="status" value={seller.status} />,
      ])} />
    </AdminShell>
  );
}
