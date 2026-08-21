import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, FileSpreadsheet } from "lucide-react";
import { notFound } from "next/navigation";

import { commitInventoryImportAction } from "@/app/(protected)/assisted-inventory-actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { SellerSubmitButton } from "@/components/seller/seller-submit-button";
import { Button } from "@/components/ui/button";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { getInventoryImport } from "@/lib/inventory/data";
import type { Json } from "@/lib/supabase/database.types";

function objectValue(value: Json, key: string) {
  return value && typeof value === "object" && !Array.isArray(value) && typeof value[key] === "string" ? value[key] : "—";
}

export default async function InventoryImportDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const { id } = await params;
  await requireAdminPermission("assist_seller_inventory", `/admin/inventory-onboarding/imports/${id}`);
  const [detail, query] = await Promise.all([getInventoryImport(id), searchParams]);
  if (!detail) notFound();
  const { importRecord, rows } = detail;
  const validRows = rows.filter((row) => row.status === "VALID");

  return (
    <AdminShell description="Review row-level validation before creating private seller drafts. Imported drafts still require images, seller confirmation, and moderation." title={importRecord.file_name}>
      <Button asChild className="mb-5" variant="ghost"><Link href="/admin/inventory-onboarding"><ArrowLeft aria-hidden="true" className="size-4" />Back to onboarding</Link></Button>
      {query.message === "processed" ? <div className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">Valid rows were processed into seller-owned drafts.</div> : null}
      {query.error ? <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">The import could not be completed: {query.error.replaceAll("-", " ")}.</div> : null}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Rows", importRecord.total_rows],
          ["Valid", importRecord.valid_rows],
          ["Errors", importRecord.invalid_rows],
          ["Duplicates", importRecord.duplicate_rows],
        ].map(([label, value]) => <div className="rounded-lg border border-stone-200 bg-white p-4" key={label}><p className="text-xs text-stone-500">{label}</p><p className="mt-1 font-mono text-2xl font-bold">{value}</p></div>)}
      </div>

      {validRows.length > 0 ? (
        <form action={commitInventoryImportAction} className="my-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-orange-200 bg-orange-50 p-5">
          <input name="importId" type="hidden" value={importRecord.id} />
          <div><p className="font-semibold text-stone-950">{validRows.length} validated row{validRows.length === 1 ? "" : "s"} ready</p><p className="mt-1 text-sm text-stone-600">This creates private seller drafts. Nothing is published.</p></div>
          <SellerSubmitButton pendingLabel="Creating drafts…"><CheckCircle2 aria-hidden="true" className="size-4" />Create valid drafts</SellerSubmitButton>
        </form>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="p-4">Row</th><th className="p-4">SKU</th><th className="p-4">Part</th><th className="p-4">Status</th><th className="p-4">Validation</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-stone-100 align-top" key={row.id}>
                <td className="p-4 font-mono">{row.row_number}</td>
                <td className="p-4 font-mono">{objectValue(row.raw_data, "sku")}</td>
                <td className="p-4 font-semibold">{objectValue(row.raw_data, "partname")}</td>
                <td className="p-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${row.status === "VALID" || row.status === "IMPORTED" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{row.status === "VALID" || row.status === "IMPORTED" ? <CheckCircle2 aria-hidden="true" className="size-3.5" /> : <CircleAlert aria-hidden="true" className="size-3.5" />}{row.status.toLowerCase()}</span></td>
                <td className="p-4 text-xs leading-5 text-stone-600">{row.validation_errors.length > 0 ? row.validation_errors.join(" ") : row.status === "IMPORTED" ? `Draft ${row.product_id?.slice(0, 8)} created.` : "Ready to import."}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <div className="p-10 text-center text-sm text-stone-500"><FileSpreadsheet aria-hidden="true" className="mx-auto mb-3 size-6" />No rows were stored for this import.</div> : null}
      </div>
    </AdminShell>
  );
}