import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { ProductCondition } from "@/lib/supabase/database.types";

const pageSize = 24;

export type MarketplaceSearch = {
  availability?: "in-stock";
  brand?: string;
  category?: string;
  condition?: ProductCondition;
  delivery?: "true";
  location?: string;
  maxPrice?: number;
  minPrice?: number;
  page: number;
  pickup?: "true";
  q?: string;
  seller?: string;
  sort: "newest" | "price-asc" | "price-desc" | "relevance";
  vehicle?: string;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : undefined;
}

function safeText(value: string | undefined, maximum = 100) {
  if (!value) return undefined;
  return value.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum) || undefined;
}

function safeUuid(value: string | undefined) {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined;
}
function safeMoney(value: string | undefined) {
  if (!value || !/^\d{1,9}(?:\.\d{1,2})?$/.test(value)) return undefined;
  const [naira = "0", kobo = ""] = value.split(".");
  return Number(naira) * 100 + Number(kobo.padEnd(2, "0"));
}

export function parseMarketplaceSearch(params: RawSearchParams): MarketplaceSearch {
  const sort = first(params.sort);
  const page = Number(first(params.page));
  return {
    availability: first(params.availability) === "in-stock" ? "in-stock" : undefined,
    brand: safeText(first(params.brand)),
    category: safeUuid(first(params.category)),
    condition: ["NEW", "USED", "REFURBISHED", "RECONDITIONED", "OEM_TAKE_OFF", "AFTERMARKET"].includes(first(params.condition) ?? "")
      ? (first(params.condition) as ProductCondition)
      : undefined,
    delivery: first(params.delivery) === "true" ? "true" : undefined,
    location: safeText(first(params.location)),
    maxPrice: safeMoney(first(params.maxPrice)),
    minPrice: safeMoney(first(params.minPrice)),
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 500) : 1,
    pickup: first(params.pickup) === "true" ? "true" : undefined,
    q: safeText(first(params.q), 160),
    seller: safeUuid(first(params.seller)),
    sort: ["newest", "price-asc", "price-desc"].includes(sort ?? "")
      ? (sort as MarketplaceSearch["sort"])
      : "relevance",
    vehicle: safeUuid(first(params.vehicle)),
  };
}

export type MarketplaceVehicleOption = {
  engine: string | null;
  engineId: string | null;
  id: string;
  label: string;
  make: string;
  makeId: string;
  model: string;
  modelId: string;
  trim: string | null;
  trimId: string | null;
  year: number;
  yearId: string;
};

export async function getMarketplaceOptions() {
  const supabase = await createClient();
  const [
    categoriesResult,
    productsResult,
    sellersResult,
    fitmentsResult,
    makesResult,
    modelsResult,
    yearsResult,
    trimsResult,
    enginesResult,
  ] = await Promise.all([
    supabase.from("product_categories").select("id, name, parent_id, position").eq("is_active", true).order("position"),
    supabase.from("products").select("brand, state, seller_id").eq("status", "APPROVED").limit(1000),
    supabase.from("marketplace_sellers").select("seller_id, store_name").order("store_name"),
    supabase.from("vehicle_fitments").select("id, make_id, model_id, year_id, trim_id, engine_id"),
    supabase.from("vehicle_makes").select("id, name"),
    supabase.from("vehicle_models").select("id, name"),
    supabase.from("vehicle_years").select("id, year"),
    supabase.from("vehicle_trims").select("id, name"),
    supabase.from("engines").select("id, name"),
  ]);

  const categoryRows = categoriesResult.data ?? [];
  const names = new Map(categoryRows.map((category) => [category.id, category.name]));
  const categories = categoryRows.map((category) => ({
    id: category.id,
    label: category.parent_id
      ? `${names.get(category.parent_id) ?? "Category"} / ${category.name}`
      : category.name,
    parentId: category.parent_id,
  })).sort((a, b) => a.label.localeCompare(b.label));

  const makes = new Map((makesResult.data ?? []).map((row) => [row.id, row.name]));
  const models = new Map((modelsResult.data ?? []).map((row) => [row.id, row.name]));
  const years = new Map((yearsResult.data ?? []).map((row) => [row.id, row.year]));
  const trims = new Map((trimsResult.data ?? []).map((row) => [row.id, row.name]));
  const engines = new Map((enginesResult.data ?? []).map((row) => [row.id, row.name]));
  const vehicles: MarketplaceVehicleOption[] = (fitmentsResult.data ?? []).flatMap((fitment) => {
    const make = makes.get(fitment.make_id);
    const model = models.get(fitment.model_id);
    const year = years.get(fitment.year_id);
    if (!make || !model || !year) return [];
    const trim = fitment.trim_id ? (trims.get(fitment.trim_id) ?? null) : null;
    const engine = fitment.engine_id ? (engines.get(fitment.engine_id) ?? null) : null;
    return [{
      engine,
      engineId: fitment.engine_id,
      id: fitment.id,
      label: [year, make, model, trim, engine].filter(Boolean).join(" · "),
      make,
      makeId: fitment.make_id,
      model,
      modelId: fitment.model_id,
      trim,
      trimId: fitment.trim_id,
      year,
      yearId: fitment.year_id,
    }];
  }).sort((a, b) => a.label.localeCompare(b.label));

  return {
    brands: [...new Set((productsResult.data ?? []).map((row) => row.brand))].sort(),
    categories,
    locations: [...new Set((productsResult.data ?? []).map((row) => row.state))].sort(),
    sellers: sellersResult.data ?? [],
    vehicles,
  };
}

function intersect(left: string[] | null, right: string[]) {
  if (left === null) return right;
  const rightSet = new Set(right);
  return left.filter((id) => rightSet.has(id));
}

export async function searchMarketplaceProducts(search: MarketplaceSearch) {
  const supabase = await createClient();
  let allowedIds: string[] | null = null;

  if (search.q) {
    const terms = search.q.split(" ").filter(Boolean);
    const pattern = `%${terms.join("%")}%`;
    const { data } = await supabase
      .from("marketplace_product_search")
      .select("product_id")
      .ilike("search_text", pattern)
      .limit(1000);
    allowedIds = (data ?? []).map((row) => row.product_id);
  }

  if (search.vehicle) {
    const { data } = await supabase
      .from("product_fitments")
      .select("product_id")
      .eq("fitment_id", search.vehicle)
      .eq("is_active", true)
      .not("evidence_type", "in", "(DISPUTED,KNOWN_INCORRECT)")
      .limit(1000);
    allowedIds = intersect(allowedIds, (data ?? []).map((row) => row.product_id));
  }

  if (allowedIds?.length === 0) return { count: 0, pageSize, products: [] };

  let query = supabase.from("products").select("*", { count: "exact" }).eq("status", "APPROVED");
  if (allowedIds) query = query.in("id", allowedIds);
  if (search.category) {
    const { data: categories } = await supabase.from("product_categories").select("id").or(`id.eq.${search.category},parent_id.eq.${search.category}`);
    query = query.in("category_id", (categories ?? []).map((row) => row.id).concat(search.category));
  }
  if (search.brand) query = query.ilike("brand", search.brand);
  if (search.condition) query = query.eq("condition", search.condition);
  if (search.location) query = query.or(`state.ilike.%${search.location}%,city.ilike.%${search.location}%`);
  if (search.seller) query = query.eq("seller_id", search.seller);
  if (search.minPrice !== undefined) query = query.gte("price_minor", search.minPrice);
  if (search.maxPrice !== undefined) query = query.lte("price_minor", search.maxPrice);
  if (search.availability) query = query.gt("quantity", 0);
  if (search.pickup) query = query.eq("pickup_available", true);
  if (search.delivery) query = query.eq("delivery_available", true);

  if (search.sort === "price-asc") query = query.order("price_minor", { ascending: true });
  else if (search.sort === "price-desc") query = query.order("price_minor", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const start = (search.page - 1) * pageSize;
  const { data: products, count, error } = await query.range(start, start + pageSize - 1);
  if (error || !products?.length) return { count: count ?? 0, pageSize, products: [] };

  const productIds = products.map((product) => product.id);
  const sellerIds = [...new Set(products.map((product) => product.seller_id))];
  const categoryIds = [...new Set(products.map((product) => product.category_id))];
  const [imagesResult, sellersResult, categoriesResult] = await Promise.all([
    supabase.from("product_images").select("product_id, storage_path").in("product_id", productIds).eq("is_active", true).eq("is_primary", true),
    supabase.from("marketplace_sellers").select("*").in("seller_id", sellerIds),
    supabase.from("product_categories").select("id, name").in("id", categoryIds),
  ]);
  const paths = (imagesResult.data ?? []).map((image) => image.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("product-media").createSignedUrls(paths, 3600)
    : { data: [] };
  const urlByPath = new Map((signed ?? []).map((item, index) => [paths[index], item.signedUrl ?? null]));
  const imageByProduct = new Map((imagesResult.data ?? []).map((image) => [image.product_id, urlByPath.get(image.storage_path) ?? null]));
  const sellerById = new Map((sellersResult.data ?? []).map((seller) => [seller.seller_id, seller]));
  const categoryById = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]));

  return {
    count: count ?? products.length,
    pageSize,
    products: products.map((product) => ({
      ...product,
      categoryName: categoryById.get(product.category_id) ?? "Automotive part",
      primaryImageUrl: imageByProduct.get(product.id) ?? null,
      seller: sellerById.get(product.seller_id) ?? null,
    })),
  };
}

export const getMarketplaceProduct = cache(async function getMarketplaceProduct(slug: string) {
  const supabase = await createClient();
  const { data: product, error } = await supabase.from("products").select("*").eq("slug", slug).eq("status", "APPROVED").single();
  if (error || !product) return null;

  const [imagesResult, sellerResult, categoryResult, crossReferencesResult, fitmentsResult, options] = await Promise.all([
    supabase.from("product_images").select("*").eq("product_id", product.id).eq("is_active", true).order("position"),
    supabase.from("marketplace_sellers").select("*").eq("seller_id", product.seller_id).single(),
    supabase.from("product_categories").select("name").eq("id", product.category_id).single(),
    supabase.from("product_cross_references").select("reference_number").eq("product_id", product.id).order("reference_number"),
    supabase.from("product_fitments").select("fitment_id, evidence_type, evidence_metadata").eq("product_id", product.id).eq("is_active", true).not("evidence_type", "in", "(DISPUTED,KNOWN_INCORRECT)"),
    getMarketplaceOptions(),
  ]);
  const paths = (imagesResult.data ?? []).map((image) => image.storage_path);
  const { data: signed } = paths.length
    ? await supabase.storage.from("product-media").createSignedUrls(paths, 3600)
    : { data: [] };
  const urls = new Map((signed ?? []).map((item, index) => [paths[index], item.signedUrl ?? null]));
  const evidenceByFitment = new Map(
    (fitmentsResult.data ?? []).map((row) => [row.fitment_id, {
      evidenceMetadata: row.evidence_metadata,
      evidenceType: row.evidence_type,
    }]),
  );

  return {
    categoryName: categoryResult.data?.name ?? "Automotive part",
    crossReferences: (crossReferencesResult.data ?? []).map((row) => row.reference_number),
    fitments: options.vehicles.flatMap((vehicle) => {
      const evidence = evidenceByFitment.get(vehicle.id);
      return evidence ? [{ ...vehicle, ...evidence }] : [];
    }),
    images: (imagesResult.data ?? []).map((image) => ({ ...image, signedUrl: urls.get(image.storage_path) ?? null })),
    product,
    seller: sellerResult.data,
  };
});

export const publicProductConditions: readonly ProductCondition[] = ["NEW", "USED", "REFURBISHED", "RECONDITIONED", "OEM_TAKE_OFF", "AFTERMARKET"];
