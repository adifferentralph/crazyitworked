import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type SellerProduct = Database["public"]["Tables"]["products"]["Row"];
export type SellerProductImage =
  Database["public"]["Tables"]["product_images"]["Row"] & { signedUrl: string | null };

export type ProductCategoryOption = {
  id: string;
  label: string;
};

export type VehicleFitmentOption = {
  id: string;
  label: string;
};

export async function getProductFormOptions() {
  const supabase = await createClient();
  const [
    categoriesResult,
    fitmentsResult,
    makesResult,
    modelsResult,
    yearsResult,
    trimsResult,
    enginesResult,
    transmissionsResult,
    drivetrainsResult,
  ] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, name, parent_id, position")
      .eq("is_active", true)
      .order("position"),
    supabase.from("vehicle_fitments").select("*"),
    supabase.from("vehicle_makes").select("id, name"),
    supabase.from("vehicle_models").select("id, name"),
    supabase.from("vehicle_years").select("id, year"),
    supabase.from("vehicle_trims").select("id, name"),
    supabase.from("engines").select("id, name"),
    supabase.from("transmissions").select("id, name"),
    supabase.from("drivetrains").select("id, name"),
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

  const makes = new Map((makesResult.data ?? []).map((item) => [item.id, item.name]));
  const models = new Map((modelsResult.data ?? []).map((item) => [item.id, item.name]));
  const years = new Map((yearsResult.data ?? []).map((item) => [item.id, item.year]));
  const trims = new Map((trimsResult.data ?? []).map((item) => [item.id, item.name]));
  const engines = new Map((enginesResult.data ?? []).map((item) => [item.id, item.name]));
  const transmissions = new Map(
    (transmissionsResult.data ?? []).map((item) => [item.id, item.name]),
  );
  const drivetrains = new Map((drivetrainsResult.data ?? []).map((item) => [item.id, item.name]));

  const fitments: VehicleFitmentOption[] = (fitmentsResult.data ?? [])
    .map((fitment) => ({
      id: fitment.id,
      label: [
        years.get(fitment.year_id),
        makes.get(fitment.make_id),
        models.get(fitment.model_id),
        fitment.trim_id ? trims.get(fitment.trim_id) : null,
        fitment.engine_id ? engines.get(fitment.engine_id) : null,
        fitment.transmission_id ? transmissions.get(fitment.transmission_id) : null,
        fitment.drivetrain_id ? drivetrains.get(fitment.drivetrain_id) : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return { categories, fitments };
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
