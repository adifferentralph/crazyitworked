import Link from "next/link";
import { ArrowLeft, Download, FileSpreadsheet, ShieldCheck } from "lucide-react";

import { uploadInventoryCsvAction } from "@/app/(protected)/assisted-inventory-actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { SellerSubmitButton } from "@/components/seller/seller-submit-button";
import { Button } from "@/components/ui/button";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { getInventoryOnboardingSellers } from "@/lib/inventory/data";

const knownErrors: Record<string, string> = {
  "duplicate-file": "This exact file was already imported for the selected seller.",
  "invalid-file": "Upload a CSV or plain-text CSV file no larger than 2 MB.",
  "missing-input": "Choose an eligible seller and a CSV file.",
  "reference-data": "Marketplace reference data could not be loaded.",
  "save-failed": "The import history could not be saved.",
};

export default async function InventoryImportPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdminPermission("assist_seller_inventory", "/admin/inventory-onboarding/import");
  const [{ error }, sellers] = await Promise.all([searchParams, getInventoryOnboardingSellers()]);
  const errorMessage = error ? (knownErrors[error] ?? error) : null;

  return (
    <AdminShell description="Validate every row before creating seller-owned drafts. Imports never publish automatically, silently overwrite SKUs, or bypass the five-image standard." title="Import seller inventory">
      <div className="mb-6 flex flex-wrap gap-3">
        <Button asChild variant="ghost"><Link href="/admin/inventory-onboarding"><ArrowLeft aria-hidden="true" className="size-4" />Back to onboarding</Link></Button>
        <Button asChild variant="outline"><a download href="/templates/inventory-import-template.csv"><Download aria-hidden="true" className="size-4" />Download CSV template</a></Button>
      </div>
      {errorMessage ? <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">{errorMessage}</div> : null}

      <form action={uploadInventoryCsvAction} className="grid max-w-3xl gap-6 rounded-lg border border-stone-200 bg-white p-6 sm:p-8">
        <div>
          <label className="mb-2 block text-sm font-semibold text-stone-800" htmlFor="sellerId">Seller</label>
          <select className="flex h-11 w-full rounded-md border bg-white px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary" id="sellerId" name="sellerId" required>
            <option value="">Choose a seller</option>
            {sellers.map((seller) => <option key={seller.seller_id} value={seller.seller_id}>{seller.store_name} · {[seller.city, seller.state].filter(Boolean).join(", ")}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-stone-800" htmlFor="inventoryCsv">Inventory CSV</label>
          <input accept=".csv,text/csv,text/plain" className="block w-full rounded-md border border-stone-200 p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-stone-950 file:px-3 file:py-2 file:font-semibold file:text-white" id="inventoryCsv" name="inventoryCsv" required type="file" />
          <p className="mt-2 text-xs leading-5 text-stone-500">Maximum 1,000 rows and 2 MB. Prices are NGN. Use Location as “City, State”.</p>
        </div>
        <div className="rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-stone-700">
          <div className="flex gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" /><p>Rows are staged for review first. Valid rows become private drafts only after confirmation from this screen; sellers then add or review five genuine images before submission.</p></div>
        </div>
        <SellerSubmitButton pendingLabel="Validating CSV…"><FileSpreadsheet aria-hidden="true" className="size-4" />Upload and validate</SellerSubmitButton>
      </form>
    </AdminShell>
  );
}