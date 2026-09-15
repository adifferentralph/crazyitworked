import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/lib/auth/principal";
import { getAdminSectionMetrics } from "@/lib/admin/operations";

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default async function AdminOperationalSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  await requireRole(["ADMIN"], `/admin/${section}`);
  const metrics = await getAdminSectionMetrics();

  const sections: Record<string, { description: string; detail: string; href?: string; hrefLabel?: string; title: string; value: string }> = {
    reviews: {
      title: "Reviews",
      description: "Customer review moderation.",
      value: "Not tracked in V1",
      detail: "There is no dedicated review workflow table yet, so no production review count is shown.",
    },
    disputes: {
      title: "Disputes",
      description: "Marketplace dispute operations.",
      value: "Not tracked in V1",
      detail: "The current V1 schema has no dedicated dispute case workflow. This page does not invent case data.",
    },
    finance: {
      title: "Finance",
      description: "Read-only marketplace finance overview.",
      value: metrics.paymentCount.toLocaleString("en-NG"),
      detail: "Recorded payment attempts. Financial mutation rules remain outside this correction sprint.",
    },
    "held-funds": {
      title: "Held Funds",
      description: "Current canonical seller ledger held balance.",
      value: money.format(metrics.heldMinor / 100),
      detail: "Calculated from immutable HELD bucket credits minus debits in NGN minor units.",
    },
    withdrawals: {
      title: "Withdrawals",
      description: "Seller withdrawal operations.",
      value: "Not tracked in V1",
      detail: "No withdrawal request table exists in the current V1 schema. Payout architecture was intentionally left unchanged.",
    },
    "vehicle-catalogue": {
      title: "Vehicle Catalogue",
      description: "Cached vehicle make, model and fitment coverage.",
      value: `${metrics.makeCount.toLocaleString("en-NG")} makes`,
      detail: `${metrics.modelCount.toLocaleString("en-NG")} models and ${metrics.fitmentCount.toLocaleString("en-NG")} configured fitments.`,
      href: "/admin/fitment-intelligence",
      hrefLabel: "Open fitment operations",
    },
    notifications: {
      title: "Notifications",
      description: "Stored user notification activity.",
      value: metrics.activeNotifications.toLocaleString("en-NG"),
      detail: "Notifications currently recorded in the live database.",
    },
    permissions: {
      title: "Permissions",
      description: "Administrative roles and permission catalogue.",
      value: `${metrics.adminRoleCount} roles`,
      detail: `${metrics.permissionCount} permission definitions are enforced server-side.`,
    },
    settings: {
      title: "Settings",
      description: "Sensitive marketplace configuration.",
      value: "Environment-managed",
      detail: "No mutable settings table exists. Secrets and deployment configuration remain outside browser-accessible data.",
    },
    security: {
      title: "Security",
      description: "Identity and authorization boundaries.",
      value: "Authoritative roles",
      detail: "Admin, seller and buyer destinations are resolved from the server-side profile role. Database triggers block conflicting role profiles.",
    },
  };
  const current = sections[section];
  if (!current) notFound();

  return (
    <AdminShell description={current.description} title={current.title}>
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-3xl font-bold text-stone-950">{current.value}</p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">{current.detail}</p>
        {current.href && current.hrefLabel ? <Link className="mt-5 inline-flex rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700" href={current.href}>{current.hrefLabel}</Link> : null}
      </div>
    </AdminShell>
  );
}
