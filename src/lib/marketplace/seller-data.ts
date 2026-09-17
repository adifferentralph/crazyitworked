import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { vehicleFitments, vehicleMakes, vehicleModels, vehicleYears } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { MarketplaceVehicleMakeOption } from "@/lib/marketplace/search-options";

export type SellerProduct = Database["public"]["Tables"]["products"]["Row"];
export type SellerProductImage =
  Database["public"]["Tables"]["product_images"]["Row"] & { signedUrl: string | null };

export type ProductCategoryOption = {
  id: string;
  label: string;
};

export async function getProductFormOptions() {
  const supabase = await createClient();
  const marketplaceMakeSlugs = [
    "toyota",
    "honda",
    "lexus",
    "mercedes-benz",
    "bmw",
    "volkswagen",
    "peugeot",
    "ford",
    "hyundai",
    "kia",
    "nissan",
    "land-rover",
    "mazda",
    "mitsubishi",
    "byd",
    "saab",
  ];
  const [categoriesResult, makesResult] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, name, parent_id, position")
      .eq("is_active", true)
      .order("position"),
    supabase
      .from("vehicle_makes")
      .select("id, name, is_discontinued, origin_country")
      .eq("is_active", true)
      .in("slug", marketplaceMakeSlugs)
      .order("name"),
  ]);

  const categoryRows = categoriesResult.data ?? [];
  const categoryNames = new Map(categoryRows.map((category) => [category.id, category.name]));
  const categories: ProductCategoryOption[] = categoryRows
    .map((category) => ({
      id: category.id,
      label: category.parent_id
        ? `${categoryNames.get(category.parent_id) ?? "Category"} / ${category.name}`
        : category.name,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  const makes: MarketplaceVehicleMakeOption[] = (makesResult.data ?? []).map(
    (make) => ({
      id: make.id,
      isDiscontinued: make.is_discontinued,
      label: make.name,
      originCountry: make.origin_country,
    }),
  );

  return { categories, makes };
}

export type VehicleFitmentOption = {
  id: string;
  label: string;
};

export async function getInventoryImportOptions() {
  const [{ categories }, db] = await Promise.all([
    getProductFormOptions(),
    getDatabase(),
  ]);
  const rows = await db
    .select({
      id: vehicleFitments.id,
      make: vehicleMakes.name,
      model: vehicleModels.name,
      year: vehicleYears.year,
    })
    .from(vehicleFitments)
    .innerJoin(vehicleMakes, eq(vehicleMakes.id, vehicleFitments.makeId))
    .innerJoin(vehicleModels, eq(vehicleModels.id, vehicleFitments.modelId))
    .innerJoin(vehicleYears, eq(vehicleYears.id, vehicleFitments.yearId));

  return {
    categories,
    fitments: rows.map((row) => ({
      id: row.id,
      label: `${row.year} · ${row.make} · ${row.model}`,
    })),
  };
}

export async function getSellerProduct(productId: string, sellerId: string) {
  const supabase = await createClient();
  const [productResult, crossReferencesResult, fitmentsResult, imagesResult, inventoryResult] =
    await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("seller_id", sellerId)
        .single(),
      supabase
        .from("product_cross_references")
        .select("reference_number")
        .eq("product_id", productId)
        .order("reference_number"),
      supabase.from("product_fitments").select("fitment_id").eq("product_id", productId),
      supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("position"),
      supabase
        .from("inventory_transactions")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  if (productResult.error || !productResult.data) return null;

  const imageRows = imagesResult.data ?? [];
  const activePaths = imageRows.filter((image) => image.is_active).map((image) => image.storage_path);
  const { data: signedImages } =
    activePaths.length > 0
      ? await supabase.storage.from("product-media").createSignedUrls(activePaths, 3600)
      : { data: [] };
  const signedUrls = new Map(
    (signedImages ?? []).map((image, index) => [activePaths[index], image.signedUrl ?? null]),
  );

  return {
    crossReferences: (crossReferencesResult.data ?? []).map((item) => item.reference_number),
    fitmentIds: (fitmentsResult.data ?? []).map((item) => item.fitment_id),
    images: imageRows.map((image) => ({
      ...image,
      signedUrl: image.is_active ? (signedUrls.get(image.storage_path) ?? null) : null,
    })) as SellerProductImage[],
    inventory: inventoryResult.data ?? [],
    product: productResult.data,
  };
}

export async function getSellerProducts(sellerId: string) {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", sellerId)
    .order("updated_at", { ascending: false });

  if (error || !products || products.length === 0) return [];

  const productIds = products.map((product) => product.id);
  const { data: images } = await supabase
    .from("product_images")
    .select("product_id, storage_path")
    .in("product_id", productIds)
    .eq("is_active", true)
    .eq("is_primary", true);
  const imagePaths = (images ?? []).map((image) => image.storage_path);
  const { data: signedImages } =
    imagePaths.length > 0
      ? await supabase.storage.from("product-media").createSignedUrls(imagePaths, 3600)
      : { data: [] };
  const signedByPath = new Map(
    (signedImages ?? []).map((image, index) => [imagePaths[index], image.signedUrl ?? null]),
  );
  const primaryByProduct = new Map(
    (images ?? []).map((image) => [image.product_id, signedByPath.get(image.storage_path) ?? null]),
  );

  return products.map((product) => ({
    ...product,
    primaryImageUrl: primaryByProduct.get(product.id) ?? null,
  }));
}
