import Link from "next/link";
import { FilePlus2, FileSpreadsheet, ImageIcon, PackageCheck } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { getInventoryImports, getInventoryOnboardingProducts } from "@/lib/inventory/data";

const sourceLabels = {
  BULK_IMPORT: "Bulk import",
  PLATFORM_ASSISTED: "Platform assisted",
  SELLER: "Seller",
} as const;

export default async function InventoryOnboardingPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  await requireAdminPermission("assist_seller_inventory", "/admin/inventory-onboarding");
  const [{ message }, products, imports] = await Promise.all([
    searchParams,
    getInventoryOnboardingProducts(),
    getInventoryImports(),
  ]);
  const awaitingSeller = products.filter((product) => !product.seller_acknowledged_at && product.product_status === "DRAFT").length;
  const awaitingModeration = products.filter((product) => product.product_status === "PENDING_REVIEW").length;
  const importErrors = imports.filter((item) => item.status === "HAS_ERRORS").length;

  return (
    <AdminShell
      description="Digitise seller stock without using seller passwords. Ownership, original media, creator provenance, and seller confirmation remain enforced."
      title="Inventory onboarding"
    >
      {message === "draft-created" ? <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">Seller-owned assisted draft created successfully.</div> : null}
      <div className="mb-8 flex flex-wrap gap-3">
        <Button asChild><Link href="/admin/inventory-onboarding/new"><FilePlus2 aria-hidden="true" className="size-4" />New assisted listing</Link></Button>
        <Button asChild variant="outline"><Link href="/admin/inventory-onboarding/import"><FileSpreadsheet aria-hidden="true" className="size-4" />Import CSV</Link></Button>
      </div>

      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          ["Awaiting seller", awaitingSeller],
          ["Awaiting moderation", awaitingModeration],
          ["Imports with errors", importErrors],
        ].map(([label, value]) => <div className="rounded-lg border border-stone-200 bg-white p-5" key={label}><dt className="text-sm text-stone-500">{label}</dt><dd className="mt-2 font-mono text-3xl font-bold text-stone-950">{value}</dd></div>)}
      </dl>

      <section className="mt-9">
        <h2 className="font-display text-2xl font-semibold text-stone-950">Assisted drafts</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white">
          {products.map((product) => (
            <div className="grid gap-3 border-b border-stone-100 p-5 last:border-0 md:grid-cols-[1fr_auto] md:items-center" key={product.product_id}>
              <div>
                <p className="font-semibold text-stone-950">{product.product_name}</p>
                <p className="mt-1 text-sm text-stone-600">{product.store_name} · <span className="font-mono">{product.sku}</span> · {sourceLabels[product.creation_source]}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-stone-600">
                <span className="inline-flex items-center gap-1"><ImageIcon aria-hidden="true" className="size-4" />{product.active_image_count}/5 images</span>
                <span className="rounded-full bg-stone-100 px-3 py-1">{product.product_status.replaceAll("_", " ").toLowerCase()}</span>
                <span>{product.seller_acknowledged_at ? "Seller confirmed" : "Seller review needed"}</span>
              </div>
            </div>
          ))}
          {products.length === 0 ? <div className="p-10 text-center text-sm text-stone-500"><PackageCheck aria-hidden="true" className="mx-auto mb-3 size-7" />No assisted drafts yet.</div> : null}
        </div>
      </section>

      <section className="mt-9">
        <h2 className="font-display text-2xl font-semibold text-stone-950">Import history</h2>
        <div className="mt-4 grid gap-3">
          {imports.map((item) => (
            <Link className="grid gap-2 rounded-lg border border-stone-200 bg-white p-5 hover:border-primary md:grid-cols-[1fr_auto] md:items-center" href={`/admin/inventory-onboarding/imports/${item.id}`} key={item.id}>
              <div><p className="font-semibold text-stone-950">{item.file_name}</p><p className="mt-1 text-xs text-stone-500">{item.total_rows} rows · {item.imported_rows} drafts created</p></div>
              <span className="text-xs font-bold uppercase tracking-wide text-stone-600">{item.status.replaceAll("_", " ")}</span>
            </Link>
          ))}
          {imports.length === 0 ? <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">No CSV imports have been uploaded.</p> : null}
        </div>
      </section>
    </AdminShell>
  );
}