import Link from "next/link";
import { ArrowLeft, MapPin, Store } from "lucide-react";

import { createAssistedProductAction } from "@/app/(protected)/assisted-inventory-actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { ProductForm, type ProductFormDefaults } from "@/components/seller/product-form";
import { Button } from "@/components/ui/button";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { getInventoryOnboardingSellers } from "@/lib/inventory/data";
import { getProductFormOptions } from "@/lib/marketplace/seller-data";

export default async function NewAssistedListingPage({ searchParams }: { searchParams: Promise<{ seller?: string }> }) {
  await requireAdminPermission("assist_seller_inventory", "/admin/inventory-onboarding/new");
  const [{ seller: sellerId }, sellers] = await Promise.all([searchParams, getInventoryOnboardingSellers()]);
  const seller = sellers.find((candidate) => candidate.seller_id === sellerId);

  if (!seller) {
    return (
      <AdminShell description="Choose the seller who will own the listing. Staff assistance never changes product ownership or requires the seller password." title="Choose a seller">
        <Button asChild className="mb-5" variant="ghost"><Link href="/admin/inventory-onboarding"><ArrowLeft aria-hidden="true" className="size-4" />Back to onboarding</Link></Button>
        <div className="grid gap-3 md:grid-cols-2">
          {sellers.map((candidate) => (
            <Link className="rounded-lg border border-stone-200 bg-white p-5 hover:border-primary" href={`/admin/inventory-onboarding/new?seller=${candidate.seller_id}`} key={candidate.seller_id}>
              <Store aria-hidden="true" className="size-5 text-primary" />
              <h2 className="mt-3 text-lg font-semibold text-stone-950">{candidate.store_name}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-stone-600"><MapPin aria-hidden="true" className="size-4" />{[candidate.city, candidate.state].filter(Boolean).join(", ") || "Location pending"}</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-stone-500">{candidate.seller_status.replaceAll("_", " ")}</p>
            </Link>
          ))}
          {sellers.length === 0 ? <p className="rounded-lg border border-dashed border-stone-300 p-8 text-sm text-stone-500">No onboarded sellers are currently eligible.</p> : null}
        </div>
      </AdminShell>
    );
  }

  const { categories, fitments } = await getProductFormOptions();
  const defaults: ProductFormDefaults = {
    brand: "",
    categoryId: "",
    city: seller.city ?? "",
    condition: "NEW",
    crossReferences: "",
    deliveryAvailable: true,
    description: "",
    fitmentIds: [],
    imageTypes: [],
    manufacturerPartNumber: "",
    name: "",
    oemPartNumber: "",
    pickupAvailable: true,
    priceNgn: "",
    quantity: 1,
    sku: "",
    state: seller.state ?? "",
  };

  return (
    <AdminShell description={`Create a seller-owned draft for ${seller.store_name}. The seller must review and confirm it before marketplace moderation.`} title="New assisted listing">
      <Button asChild className="mb-5" variant="ghost"><Link href="/admin/inventory-onboarding/new"><ArrowLeft aria-hidden="true" className="size-4" />Change seller</Link></Button>
      <ProductForm
        actionOverride={createAssistedProductAction}
        allowSubmitReview={false}
        categories={categories}
        defaults={defaults}
        fitments={fitments}
        hiddenFields={[{ name: "sellerId", value: seller.seller_id }]}
        imageDescription="Upload up to five genuine images captured for this seller. The five-image evidence standard remains required before seller confirmation. Originals are preserved."
        mode="create"
        showDraftRecoveryLink={false}
      />
    </AdminShell>
  );
}