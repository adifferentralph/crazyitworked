import { redirect } from "next/navigation";

import { ProductForm, type ProductFormDefaults } from "@/components/seller/product-form";
import { SellerShell } from "@/components/seller/seller-shell";
import { requireRole } from "@/lib/auth/principal";
import { getProductFormOptions } from "@/lib/marketplace/seller-data";
import { createClient } from "@/lib/supabase/server";

export default async function NewProductPage() {
  const principal = await requireRole(["SELLER"], "/seller/products/new");
  const supabase = await createClient();
  const { data: seller } = await supabase.from("seller_profiles").select("onboarding_completed_at, state, city").eq("user_id", principal.id).single();
  if (!seller?.onboarding_completed_at) redirect("/seller/onboarding?next=/seller/products/new");

  const { categories, makes } = await getProductFormOptions();
  const defaults: ProductFormDefaults = {
    brand: "",
    categoryId: "",
    city: seller.city ?? "",
    condition: "NEW",
    crossReferences: "",
    deliveryAvailable: true,
    deliveryFeeNgn: "0.00",
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
    <SellerShell description="Create an accurate listing, preserve your original photos, or save a draft until the required details are ready." title="Add product">
      <ProductForm categories={categories} defaults={defaults} makes={makes} mode="create" />
    </SellerShell>
  );
}
