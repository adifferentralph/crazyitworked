import { AdminSearch, AdminStatus, AdminTable } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { SellerSubmitButton } from "@/components/seller/seller-submit-button";
import { formatAdminDate } from "@/lib/admin/format";
import { getAdminMarketplaceReports } from "@/lib/admin/operations";
import { requireAdminPermission } from "@/lib/auth/permissions";

import { moderateMarketplaceReportAction } from "./actions";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; q?: string }>;
}) {
  await requireAdminPermission("reports.manage", "/admin/reports");
  const { error, message, q } = await searchParams;
  const reports = await getAdminMarketplaceReports(q);

  return (
    <AdminShell description="Review product and merchant reports. Trust scores change only after an authorized decision." title="Marketplace reports">
      {message ? <p className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">Moderation decision saved.</p> : null}
      {error ? <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
      <AdminSearch defaultValue={q} placeholder="Search product, merchant or reporter" />
      <AdminTable
        columns={["Target", "Report", "Status", "Submitted", "Decision"]}
        emptyMessage="No marketplace reports match this search."
        rows={reports.map((report) => [
          <div className="min-w-44" key="target">
            <p className="font-bold text-stone-950">{report.productName ?? report.storeName}</p>
            <p className="text-xs text-stone-500">{report.targetType.toLowerCase()} · {report.storeName}</p>
            <p className="mt-1 text-xs text-stone-500">{report.repeatIncidentCount} report{report.repeatIncidentCount === 1 ? "" : "s"} for this target</p>
          </div>,
          <div className="max-w-72" key="report">
            <p className="font-semibold text-stone-800">{report.reason.replaceAll("_", " ").toLowerCase()}</p>
            {report.explanation ? <p className="mt-1 text-xs leading-5 text-stone-600">{report.explanation}</p> : null}
            <p className="mt-1 text-xs text-stone-500">Reporter: {report.reporterEmail}</p>
          </div>,
          <div className="space-y-1" key="status"><AdminStatus value={report.status} />{report.moderationReason ? <p className="max-w-52 text-xs text-stone-500">{report.moderationReason}</p> : null}</div>,
          formatAdminDate(report.createdAt),
          <form action={moderateMarketplaceReportAction} className="grid min-w-60 gap-2" key="decision">
            <input name="reportId" type="hidden" value={report.id} />
            <select className="h-9 rounded-md border border-stone-300 bg-white px-2 text-xs" defaultValue="MINOR" name="severity">
              <option value="MINOR">Minor impact (-0.25)</option>
              <option value="MODERATE">Moderate impact (-0.50)</option>
              <option value="SERIOUS">Serious impact (-0.75)</option>
            </select>
            <input className="h-9 rounded-md border border-stone-300 px-2 text-xs" minLength={5} name="reason" placeholder="Required moderation reason" required />
            <div className="flex flex-wrap gap-2">
              {report.status === "PENDING" ? (
                <>
                  <SellerSubmitButton name="action" pendingLabel="Saving..." size="sm" value="uphold">Uphold</SellerSubmitButton>
                  <SellerSubmitButton name="action" pendingLabel="Saving..." size="sm" value="dismiss" variant="outline">Dismiss</SellerSubmitButton>
                </>
              ) : (
                <SellerSubmitButton name="action" pendingLabel="Saving..." size="sm" value="resolve" variant="outline">Resolve / reverse</SellerSubmitButton>
              )}
            </div>
          </form>,
        ])}
      />
    </AdminShell>
  );
}
