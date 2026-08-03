export type MarketplaceRole =
  | "buyer"
  | "vendor"
  | "support_agent"
  | "moderator"
  | "admin"
  | "super_admin";

export type VehicleSelection = {
  year?: number;
  make?: string;
  model?: string;
  variant?: string;
};

export type Money = {
  amount: number;
  currency: string;
};

export type CatalogHit = {
  objectID: string;
  slug: string;
  title: string;
  sku: string;
  vendorId: string;
  vendorName: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  currency: string;
  ratingAverage: number;
  ratingCount: number;
  locationCity: string;
  locationState: string;
  availability: "in_stock" | "low_stock" | "out_of_stock" | "preorder";
  imageUrl?: string;
  oemNumbers: string[];
  aftermarketReferences: string[];
  fitmentYears: number[];
  fitmentMakes: string[];
  fitmentModels: string[];
  fitmentVariants: string[];
  isSponsored: boolean;
  sponsoredRank?: number;
};

export type DashboardMetric = {
  label: string;
  value: string;
  delta?: string;
};
