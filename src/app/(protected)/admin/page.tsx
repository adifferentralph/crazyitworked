import Link from "next/link";
import {
  BadgeAlert,
  GalleryHorizontal,
  PackageCheck,
  PackageSearch,
  ShoppingBag,
  Store,
  Users,
  Wrench,
} from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/lib/auth/principal";
import { getAdminDashboardMetrics } from "@/lib/admin/operations";

export default async function AdminPage() {
  const principal = await requireRole(["ADMIN"], "/admin");
  const metrics = await getAdminDashboardMetrics();
  const cards = [
    { href: "/admin/sellers", icon: Store, label: "Pending seller onboarding", value: metrics.pendingSellerOnboarding },
    { href: "/admin/approvals", icon: PackageCheck, label: "Pending products", value: metrics.pendingProducts },
    { href: "/admin/orders", icon: ShoppingBag, label: "Orders requiring action", value: metrics.ordersRequiringAction },
    { href: "/admin/requests", icon: Wrench, label: "Open RFQs", value: metrics.openRfqs },
    { href: "/admin/sellers", icon: Store, label: "Active sellers", value: metrics.activeSellers },
    { href: "/admin/customers", icon: Users, label: "Registered buyers", value: metrics.buyerCount },
    { href: "/admin/products", icon: PackageSearch, label: "Marketplace products", value: metrics.marketplaceProducts },
    { href: "/admin/finance", icon: BadgeAlert, label: "Payment exceptions", value: metrics.paymentExceptions },
    { href: "/admin/banners", icon: GalleryHorizontal, label: "Active marketplace ads", value: metrics.activeAds },
  ] as const;

  return (
    <AdminShell
      description="Live operational counts from the marketplace database. Administrative access is separate from every seller store."
      title={`Dashboard — ${principal.fullName}`}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map(({ href, icon: Icon, label, value }) => (
          <Link className="rounded-lg border border-stone-200 bg-white p-4 hover:border-primary sm:p-5" href={href} key={label}>
            <Icon aria-hidden="true" className="size-5 text-primary" />
            <p className="mt-4 text-2xl font-bold text-stone-950">{value.toLocaleString("en-NG")}</p>
            <p className="mt-1 text-sm font-medium leading-5 text-stone-600">{label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
        Disputes are not represented by a dedicated V1 data table, so this dashboard does not manufacture a dispute count.
      </div>
    </AdminShell>
  );
}
