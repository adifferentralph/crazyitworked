import Link from "next/link";
import { Activity, Boxes, ShieldCheck } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/principal";

export default async function AdminPage() {
  const principal = await requireRole(["ADMIN"], "/admin");
  const [canAssistInventory, canManageFitment, canReadDemand] = await Promise.all([
    hasAdminPermission("assist_seller_inventory"),
    hasAdminPermission("fitment.manage"),
    hasAdminPermission("demand.read"),
  ]);

  return (
    <AdminShell
      description="Permission-scoped tools for running essential marketplace operations. Financial authority is separate from seller support access."
      title={`Operations for ${principal.fullName}`}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {canAssistInventory ? (
          <Link className="group rounded-lg border border-stone-200 bg-white p-6 hover:border-primary" href="/admin/inventory-onboarding">
            <Boxes aria-hidden="true" className="size-6 text-primary" />
            <h2 className="mt-4 text-xl font-semibold text-stone-950 group-hover:text-primary">Seller inventory onboarding</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">Create seller-owned drafts, review CSV imports, and track seller confirmation.</p>
          </Link>
        ) : null}
        {canManageFitment || canReadDemand ? (
          <Link className="group rounded-lg border border-stone-200 bg-white p-6 hover:border-primary" href="/admin/fitment-intelligence">
            <Activity aria-hidden="true" className="size-6 text-primary" />
            <h2 className="mt-4 text-xl font-semibold text-stone-950 group-hover:text-primary">Fitment & demand intelligence</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">Review evidence-backed compatibility and aggregated supply gaps within your assigned permission scope.</p>
          </Link>
        ) : null}
        <div className="rounded-lg border border-stone-200 bg-[#fffdf9] p-6">
          <ShieldCheck aria-hidden="true" className="size-6 text-primary" />
          <h2 className="mt-4 text-xl font-semibold text-stone-950">Permission boundaries active</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">Your admin role exposes only the operational tools assigned to it. Seller passwords and unrelated financial controls are never available here.</p>
        </div>
      </div>
    </AdminShell>
  );
}