import type { ProductCondition } from "@/lib/supabase/database.types";

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

export type MarketplaceOptions = {
  brands: string[];
  categories: Array<{
    id: string;
    label: string;
    parentId: string | null;
    slug: string;
  }>;
  locations: string[];
  sellers: Array<{
    seller_id: string;
    store_name: string;
  }>;
  vehicles: MarketplaceVehicleOption[];
};

export const publicProductConditions: readonly ProductCondition[] = [
  "NEW",
  "USED",
  "REFURBISHED",
  "RECONDITIONED",
  "OEM_TAKE_OFF",
  "AFTERMARKET",
];
