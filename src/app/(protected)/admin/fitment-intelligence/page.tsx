import { Activity, CarFront, SearchX, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { FitmentCorrectionForm } from "@/components/admin/fitment-correction-form";
import { hasAdminPermission } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/principal";
import { getFitmentOperationsData } from "@/lib/fitment/data";

function humanize(value: string) {
  return value.replaceAll("_", " ").toLowerCase();
}

export default async function FitmentIntelligencePage() {
  await requireRole(["ADMIN"], "/admin/fitment-intelligence");
  const [canManage, canReadDemand] = await Promise.all([
    hasAdminPermission("fitment.manage"),
    hasAdminPermission("demand.read"),
  ]);
  if (!canManage && !canReadDemand) redirect("/forbidden");
  const { claims, demand } = await getFitmentOperationsData();

  return (
    <AdminShell
      description="Review compatibility evidence without turning seller claims into verified fit, and use thresholded demand signals to find supply gaps."
      title="Fitment & Demand Intelligence"
    >
      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-stone-800">
        <p className="flex items-center gap-2 font-semibold"><ShieldCheck aria-hidden="true" className="size-4 text-primary" />Evidence rules are active</p>
        <p className="mt-1">Seller-entered compatibility remains seller-stated. Purchase outcomes are counted only after fulfilment, and public accuracy is withheld below five eligible outcomes.</p>
      </div>

      {canManage ? (
        <section className="mt-7">
          <div className="flex items-center gap-2"><CarFront aria-hidden="true" className="size-5 text-primary" /><h2 className="text-2xl font-semibold text-stone-950">Compatibility evidence queue</h2></div>
          <p className="mt-2 text-sm text-stone-600">Each correction requires a reason and appends history; it never overwrites the prior evidence record.</p>
          {claims.length ? <div className="mt-4 grid gap-4">{claims.map((claim) => (
            <article className="rounded-lg border border-stone-200 bg-white p-5" key={`${claim.product_id}:${claim.fitment_id}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{claim.store_name}</p><h3 className="mt-1 text-lg font-semibold text-stone-950">{claim.product_name}</h3><p className="mt-1 text-sm text-stone-600">{claim.vehicle_label}</p></div><div className="text-left sm:text-right"><p className="text-sm font-semibold capitalize text-stone-800">{humanize(claim.evidence_type)}</p><p className="mt-1 text-xs text-stone-500">{claim.is_active ? "Active in matching" : "Removed from matching"} · {claim.problem_event_count} problem signals</p></div></div>
              <FitmentCorrectionForm evidence={claim.evidence_type} fitmentId={claim.fitment_id} isActive={claim.is_active} productId={claim.product_id} />
            </article>
          ))}</div> : <div className="mt-4 rounded-lg border border-dashed border-stone-300 bg-white p-10 text-center"><Activity aria-hidden="true" className="mx-auto size-8 text-stone-300" /><p className="mt-3 font-semibold">No product fitment claims yet</p><p className="mt-1 text-sm text-stone-600">Evidence records will appear as sellers attach vehicle compatibility.</p></div>}
        </section>
      ) : null}

      {canReadDemand ? (
        <section className="mt-9 border-t border-stone-200 pt-8">
          <div className="flex items-center gap-2"><SearchX aria-hidden="true" className="size-5 text-primary" /><h2 className="text-2xl font-semibold text-stone-950">Demand with no supply</h2></div>
          <p className="mt-2 text-sm text-stone-600">Last 90 days. Buyer identifiers are never returned; low-volume search text stays hidden until at least three matching events exist.</p>
          {demand.length ? <div className="mt-4 overflow-x-auto rounded-lg border border-stone-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-4 py-3">Signal</th><th className="px-4 py-3">Part demand</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Buyer type</th><th className="px-4 py-3 text-right">Count</th></tr></thead><tbody>{demand.map((row, index) => <tr className="border-t border-stone-200" key={`${row.event_type}:${row.last_seen_at}:${index}`}><td className="px-4 py-3 font-semibold capitalize">{humanize(row.event_type)}</td><td className="px-4 py-3">{row.demand_topic}{row.category_name ? <span className="block text-xs text-stone-500">{row.category_name}</span> : null}</td><td className="px-4 py-3">{[row.vehicle_year, row.vehicle_make, row.vehicle_model].filter(Boolean).join(" ") || "Any vehicle"}</td><td className="px-4 py-3">{row.location ?? "Not specified"}</td><td className="px-4 py-3 capitalize">{humanize(row.buyer_account_type)}</td><td className="px-4 py-3 text-right font-mono font-bold">{row.event_count}</td></tr>)}</tbody></table></div> : <div className="mt-4 rounded-lg border border-dashed border-stone-300 bg-white p-10 text-center"><SearchX aria-hidden="true" className="mx-auto size-8 text-stone-300" /><p className="mt-3 font-semibold">No supply-gap signals yet</p><p className="mt-1 text-sm text-stone-600">Zero-result searches and unresolved part requests will aggregate here.</p></div>}
        </section>
      ) : null}
    </AdminShell>
  );
}