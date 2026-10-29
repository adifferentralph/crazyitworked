import { notFound } from "next/navigation";

import { ProductForm, type ProductFormDefaults } from "@/components/seller/product-form";
import { SellerShell } from "@/components/seller/seller-shell";
import { requireRole } from "@/lib/auth/principal";
import {
  canSellerEditProduct,
  isPublishedSellerProduct,
  priceMinorToInput,
} from "@/lib/marketplace/products";
import { getProductFormOptions, getProductShippingProfile, getSellerPickupLocationOptions, getSellerProduct } from "@/lib/marketplace/seller-data";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const principal = await requireRole(["SELLER"], `/seller/products/${id}/edit`);
  const [detail, options, pickupLocations, shipping] = await Promise.all([
    getSellerProduct(id, principal.id),
    getProductFormOptions(),
    getSellerPickupLocationOptions(principal.id),
    getProductShippingProfile(id),
  ]);
  if (!detail) notFound();
  if (!canSellerEditProduct(detail.product.status)) notFound();

  const { product } = detail;
  const published = isPublishedSellerProduct(product.status);
  const actualImage = detail.images.find((image) => image.is_active && image.is_actual_item);
  const defaults: ProductFormDefaults = {
    actualItemType: actualImage?.type,
    brand: product.brand ?? "",
    categoryId: product.category_id,
    city: product.city,
    condition: product.condition,
    crossReferences: detail.crossReferences.join("\n"),
    deliveryAvailable: product.delivery_available,
    deliveryFeeNgn: priceMinorToInput(product.delivery_fee_minor),
    description: product.description,
    fitmentIds: detail.fitmentIds,
    heightCm: shipping?.heightMm ? String(shipping.heightMm / 10) : "",
    imageTypes: detail.images.filter((image) => image.is_active).map((image) => image.type),
    manufacturerPartNumber: product.manufacturer_part_number ?? "",
    name: product.name,
    oemPartNumber: product.oem_part_number ?? "",
    pickupAvailable: product.pickup_available,
    pickupLocationId: shipping?.pickupLocationId ?? undefined,
    packagingWeightGrams: shipping?.packagingWeightGrams ?? 0,
    priceNgn: priceMinorToInput(product.price_minor),
    productId: product.id,
    quantity: product.quantity,
    sku: product.sku,
    state: product.state,
    isBulky: shipping?.isBulky ?? false,
    isFragile: shipping?.isFragile ?? false,
    lengthCm: shipping?.lengthMm ? String(shipping.lengthMm / 10) : "",
    weightKg: shipping?.weightGrams ? String(shipping.weightGrams / 1000) : "",
    widthCm: shipping?.widthMm ? String(shipping.widthMm / 10) : "",
  };

  return (
    <SellerShell
      description={
        published
          ? "Update your published listing. Replacement photos preserve the original media history."
          : "Update this private draft. Replacement photos preserve the original media history."
      }
      title="Edit product"
    >
      <ProductForm
        allowSubmitReview={product.creation_source === "SELLER" || Boolean(product.seller_acknowledged_at)}
        categories={options.categories}
        defaults={defaults}
        makes={options.makes}
        mode="edit"
        pickupLocations={pickupLocations}
        published={published}
      />
    </SellerShell>
  );
}
