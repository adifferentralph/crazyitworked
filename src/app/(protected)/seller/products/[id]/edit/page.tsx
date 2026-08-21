import { notFound } from "next/navigation";

import { ProductForm, type ProductFormDefaults } from "@/components/seller/product-form";
import { SellerShell } from "@/components/seller/seller-shell";
import { requireRole } from "@/lib/auth/principal";
import { priceMinorToInput } from "@/lib/marketplace/products";
import { getProductFormOptions, getSellerProduct } from "@/lib/marketplace/seller-data";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const principal = await requireRole(["SELLER"], `/seller/products/${id}/edit`);
  const [detail, options] = await Promise.all([
    getSellerProduct(id, principal.id),
    getProductFormOptions(),
  ]);
  if (!detail) notFound();
  if (detail.product.status !== "DRAFT" && detail.product.status !== "NEEDS_CHANGES") notFound();

  const { product } = detail;
  const actualImage = detail.images.find((image) => image.is_active && image.is_actual_item);
  const defaults: ProductFormDefaults = {
    actualItemType: actualImage?.type,
    brand: product.brand,
    categoryId: product.category_id,
    city: product.city,
    condition: product.condition,
    crossReferences: detail.crossReferences.join("\n"),
    deliveryAvailable: product.delivery_available,
    description: product.description,
    fitmentIds: detail.fitmentIds,
    imageTypes: detail.images.filter((image) => image.is_active).map((image) => image.type),
    manufacturerPartNumber: product.manufacturer_part_number ?? "",
    name: product.name,
    oemPartNumber: product.oem_part_number ?? "",
    pickupAvailable: product.pickup_available,
    priceNgn: priceMinorToInput(product.price_minor),
    productId: product.id,
    quantity: product.quantity,
    sku: product.sku,
    state: product.state,
  };

  return (
    <SellerShell description="Update this private draft. Existing seller originals stay preserved when you add replacement images." title="Edit product">
      <ProductForm
        allowSubmitReview={product.creation_source === "SELLER" || Boolean(product.seller_acknowledged_at)}
        categories={options.categories}
        defaults={defaults}
        fitments={options.fitments}
        mode="edit"
      />
    </SellerShell>
  );
}
