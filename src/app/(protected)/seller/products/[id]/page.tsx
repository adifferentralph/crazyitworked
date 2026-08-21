import Image from "next/image";
import Link from "next/link";
import { Box, Images, Pencil, Truck } from "lucide-react";
import { notFound } from "next/navigation";

import { confirmAssistedProductAction } from "@/app/(protected)/assisted-inventory-actions";
import { ProductStatusBadge } from "@/components/seller/product-status-badge";
import { SellerSubmitButton } from "@/components/seller/seller-submit-button";
import { SellerShell } from "@/components/seller/seller-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { formatNgn, productStatusLabels } from "@/lib/marketplace/products";
import { getSellerProduct } from "@/lib/marketplace/seller-data";

const notices: Record<string, { message: string; tone: "error" | "success" }> = {
  "assisted-not-ready": {
    message: "This assisted draft still needs all five required images before you can confirm it.",
    tone: "error",
  },
  "assisted-submitted": {
    message: "You confirmed the assisted listing and submitted it for marketplace review.",
    tone: "success",
  },
  "changes-saved": { message: "Product changes saved.", tone: "success" },
  "draft-created": { message: "Draft product created.", tone: "success" },
  submitted: { message: "Product submitted for marketplace review.", tone: "success" },
};

export default async function SellerProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ message?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const principal = await requireRole(["SELLER"], `/seller/products/${id}`);
  const detail = await getSellerProduct(id, principal.id);
  if (!detail) notFound();
  const { product, images, inventory, crossReferences } = detail;
  const editable = product.status === "DRAFT" || product.status === "NEEDS_CHANGES";
  const notice = query.message ? notices[query.message] : null;
  const assistedAwaitingConfirmation = product.creation_source !== "SELLER"
    && !product.seller_acknowledged_at
    && editable;

  return (
    <SellerShell description={`Private supplier view · ${productStatusLabels[product.status]}`} title={product.name}>
      {notice ? <div className={`mb-6 rounded-md border p-4 text-sm ${notice.tone === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.message}</div> : null}
      {assistedAwaitingConfirmation ? (
        <section className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-5">
          <h2 className="text-lg font-semibold text-stone-950">Review this assisted listing</h2>
          <p className="mt-2 text-sm leading-6 text-stone-700">Platform staff prepared this seller-owned draft. Check the part details, fitment, price, stock, and five genuine images. You can edit anything before confirming.</p>
          <form action={confirmAssistedProductAction} className="mt-4">
            <input name="productId" type="hidden" value={product.id} />
            <SellerSubmitButton pendingLabel="Confirming and submitting…">Confirm details and submit for review</SellerSubmitButton>
          </form>
        </section>
      ) : null}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <ProductStatusBadge status={product.status} />
        {editable ? <Button asChild><Link href={`/seller/products/${product.id}/edit`}><Pencil className="size-4" aria-hidden="true" />Edit product</Link></Button> : null}
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.filter((image) => image.is_active && image.signedUrl).map((image) => (
              <figure className="overflow-hidden rounded-lg border border-stone-200 bg-stone-100" key={image.id}>
                <div className="relative aspect-square"><Image alt={`${product.name} ${image.type.toLowerCase().replaceAll("_", " ")}`} className="object-cover" fill sizes="(max-width: 640px) 50vw, 240px" src={image.signedUrl!} unoptimized /></div>
                <figcaption className="p-2 text-xs font-semibold text-stone-600">{image.type.replaceAll("_", " ").toLowerCase()}{image.is_actual_item ? " · actual item" : ""}</figcaption>
              </figure>
            ))}
            {images.filter((image) => image.is_active).length === 0 ? <div className="col-span-full rounded-lg border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500"><Images className="mx-auto mb-3 size-7" aria-hidden="true" />No images uploaded yet.</div> : null}
          </div>
          <section className="mt-8 rounded-lg border border-stone-200 bg-white p-6">
            <h2 className="text-2xl font-semibold">Description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">{product.description}</p>
          </section>
        </div>
        <aside className="grid content-start gap-4">
          <div className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-3xl font-semibold text-stone-950">{formatNgn(product.price_minor)}</p>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-stone-500">SKU</dt><dd className="font-mono">{product.sku}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">Condition</dt><dd>{product.condition.replaceAll("_", " ").toLowerCase()}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">Brand</dt><dd>{product.brand}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">Stock</dt><dd>{product.quantity}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">Created through</dt><dd>{product.creation_source === "SELLER" ? "Seller" : product.creation_source === "BULK_IMPORT" ? "Bulk import" : "Platform assistance"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">Location</dt><dd>{product.city}, {product.state}</dd></div>
            </dl>
          </div>
          <div className="rounded-lg border border-stone-200 bg-[#fffdf9] p-5 text-sm text-stone-700">
            <div className="flex gap-2"><Truck className="mt-0.5 size-4 text-primary" aria-hidden="true" /><span>{[product.pickup_available ? "Pickup" : null, product.delivery_available ? "Delivery" : null].filter(Boolean).join(" and ")} available</span></div>
            <div className="mt-3 flex gap-2"><Box className="mt-0.5 size-4 text-primary" aria-hidden="true" /><span>OEM: {product.oem_part_number ?? "Not provided"}</span></div>
            {crossReferences.length ? <p className="mt-3 font-mono text-xs">Cross refs: {crossReferences.join(", ")}</p> : null}
          </div>
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Inventory history</h2>
            <div className="mt-4 grid gap-3">
              {inventory.map((entry) => <div className="border-t border-stone-100 pt-3 text-xs text-stone-600" key={entry.id}><p className="font-semibold text-stone-800">{entry.type.replaceAll("_", " ").toLowerCase()} · {entry.quantity_before} → {entry.quantity_after}</p><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString("en-NG")}</time></div>)}
              {inventory.length === 0 ? <p className="text-sm text-stone-500">No inventory changes recorded yet.</p> : null}
            </div>
          </section>
        </aside>
      </div>
    </SellerShell>
  );
}
