import Link from "next/link";
import { notFound } from "next/navigation";

import {
  setAdminProductPublicationAction,
  updateAdminProductAction,
} from "@/app/(protected)/admin/products/actions";
import { AdminStatus } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { getAdminProduct } from "@/lib/admin/operations";
import { priceMinorToInput, productConditions } from "@/lib/marketplace/products";
import { getProductFormOptions } from "@/lib/marketplace/seller-data";

const labelClass = "mb-1.5 block text-sm font-semibold text-stone-800";
const fieldClass =
  "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const messages: Record<string, string> = {
  restored: "The product is live in the marketplace again.",
  unpublished: "The product was removed from the marketplace. Its history and media are preserved.",
  updated: "Product changes saved.",
};

export default async function AdminEditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  await requireAdminPermission("products.edit", `/admin/products/${id}/edit`);
  const [product, options, query] = await Promise.all([
    getAdminProduct(id),
    getProductFormOptions(),
    searchParams,
  ]);
  if (!product) notFound();

  return (
    <AdminShell
      description="Edit a seller listing or remove it from the public marketplace without deleting its history."
      title="Edit product"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <AdminStatus value={product.status} />
        <Button asChild variant="outline">
          <Link href="/admin/products">Back to products</Link>
        </Button>
      </div>
      {query.error ? (
        <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
          {query.error}
        </p>
      ) : null}
      {query.message && messages[query.message] ? (
        <p className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          {messages[query.message]}
        </p>
      ) : null}

      <form action={updateAdminProductAction} className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
        <input name="id" type="hidden" value={product.id} />
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="name">Part name</label>
          <Input defaultValue={product.name} id="name" name="name" required />
        </div>
        <div>
          <label className={labelClass} htmlFor="categoryId">Category</label>
          <select className={fieldClass} defaultValue={product.categoryId} id="categoryId" name="categoryId" required>
            {options.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="condition">Condition</label>
          <select className={fieldClass} defaultValue={product.condition} id="condition" name="condition" required>
            {productConditions.map((condition) => (
              <option key={condition.value} value={condition.value}>{condition.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="brand">Brand</label>
          <Input defaultValue={product.brand} id="brand" name="brand" required />
        </div>
        <div>
          <label className={labelClass} htmlFor="sku">SKU</label>
          <Input defaultValue={product.sku} id="sku" name="sku" required />
        </div>
        <div>
          <label className={labelClass} htmlFor="oemPartNumber">OEM part number</label>
          <Input defaultValue={product.oemPartNumber ?? ""} id="oemPartNumber" name="oemPartNumber" />
          <p className="mt-1 text-xs text-stone-500">Optional</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="manufacturerPartNumber">Manufacturer part number</label>
          <Input defaultValue={product.manufacturerPartNumber ?? ""} id="manufacturerPartNumber" name="manufacturerPartNumber" />
          <p className="mt-1 text-xs text-stone-500">Optional</p>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="description">Description</label>
          <textarea className="min-h-32 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" defaultValue={product.description} id="description" name="description" required />
        </div>
        <div>
          <label className={labelClass} htmlFor="priceNgn">Price (NGN)</label>
          <Input defaultValue={priceMinorToInput(product.priceMinor)} id="priceNgn" inputMode="decimal" name="priceNgn" required />
        </div>
        <div>
          <label className={labelClass} htmlFor="quantity">Quantity</label>
          <Input defaultValue={product.quantity} id="quantity" min={0} name="quantity" required type="number" />
        </div>
        <div>
          <label className={labelClass} htmlFor="state">State</label>
          <Input defaultValue={product.state} id="state" name="state" required />
        </div>
        <div>
          <label className={labelClass} htmlFor="city">City</label>
          <Input defaultValue={product.city} id="city" name="city" required />
        </div>
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
            <input defaultChecked={product.pickupAvailable} name="pickupAvailable" type="checkbox" /> Pickup
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
            <input defaultChecked={product.deliveryAvailable} name="deliveryAvailable" type="checkbox" /> Delivery
          </label>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">Save changes</Button>
        </div>
      </form>

      <section className="mt-7 rounded-lg border border-stone-200 bg-white p-5 sm:p-7">
        <h2 className="text-lg font-bold text-stone-950">Marketplace visibility</h2>
        <p className="mt-2 text-sm text-stone-600">
          Unpublishing hides this product from buyers. It does not delete the product, its photos, or its audit history.
        </p>
        <form action={setAdminProductPublicationAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input name="id" type="hidden" value={product.id} />
          <input name="action" type="hidden" value={product.status === "SUSPENDED" ? "restore" : "unpublish"} />
          <label className="min-w-0 flex-1">
            <span className={labelClass}>Reason</span>
            <Input name="reason" placeholder="Explain why this product is being changed" required />
          </label>
          <Button type="submit" variant={product.status === "SUSPENDED" ? "default" : "destructive"}>
            {product.status === "SUSPENDED" ? "Restore product" : "Unpublish product"}
          </Button>
        </form>
      </section>
    </AdminShell>
  );
}
