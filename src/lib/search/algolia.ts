import { algoliasearch } from "algoliasearch";

import { buildAlgoliaFitmentFilter } from "@/lib/compatibility";
import type { CatalogHit, VehicleSelection } from "@/lib/marketplace/types";
import type { catalogSearchSchema } from "@/lib/validation/marketplace";
import type { z } from "zod";

type CatalogSearchInput = z.infer<typeof catalogSearchSchema>;
type SearchClient = ReturnType<typeof algoliasearch>;

let client: SearchClient | null = null;

export function isAlgoliaConfigured() {
  return Boolean(
    process.env.ALGOLIA_APP_ID &&
    (process.env.ALGOLIA_SEARCH_API_KEY || process.env.ALGOLIA_ADMIN_API_KEY) &&
    process.env.ALGOLIA_PRODUCTS_INDEX,
  );
}

function getClient(
  apiKey = process.env.ALGOLIA_SEARCH_API_KEY ?? process.env.ALGOLIA_ADMIN_API_KEY,
) {
  if (!process.env.ALGOLIA_APP_ID || !apiKey) {
    throw new Error("Algolia is not configured.");
  }

  client ??= algoliasearch(process.env.ALGOLIA_APP_ID, apiKey);
  return client;
}

function getIndexName(sort: CatalogSearchInput["sort"]) {
  const base = process.env.ALGOLIA_PRODUCTS_INDEX ?? "products";
  const replicas: Record<CatalogSearchInput["sort"], string> = {
    relevance: base,
    price_asc: `${base}_price_asc`,
    price_desc: `${base}_price_desc`,
    rating_desc: `${base}_rating_desc`,
    newest: `${base}_newest`,
  };

  return replicas[sort];
}

export async function searchCatalog(input: CatalogSearchInput) {
  if (!isAlgoliaConfigured()) {
    return {
      configured: false,
      hits: [] as CatalogHit[],
      facets: {},
      page: input.page,
      nbPages: 0,
      nbHits: 0,
    };
  }

  const filters = [
    input.category ? `categorySlug:"${escapeFilter(input.category)}"` : undefined,
    input.vendor ? `vendorName:"${escapeFilter(input.vendor)}"` : undefined,
    input.location ? `locationState:"${escapeFilter(input.location)}"` : undefined,
    input.availability ? `availability:${input.availability}` : undefined,
    input.sponsored ? "isSponsored:true" : undefined,
    input.minPrice ? `price >= ${input.minPrice}` : undefined,
    input.maxPrice ? `price <= ${input.maxPrice}` : undefined,
    input.rating ? `ratingAverage >= ${input.rating}` : undefined,
    buildAlgoliaFitmentFilter({
      year: input.year,
      make: input.make,
      model: input.model,
      variant: input.variant,
    }),
  ]
    .filter(Boolean)
    .join(" AND ");

  const result = await getClient().searchSingleIndex<CatalogHit>({
    indexName: getIndexName(input.sort),
    searchParams: {
      query: input.query,
      page: input.page,
      hitsPerPage: 24,
      filters: filters || undefined,
      facets: [
        "categorySlug",
        "vendorName",
        "locationState",
        "availability",
        "fitmentYears",
        "fitmentMakes",
        "fitmentModels",
        "fitmentVariants",
      ],
      attributesToSnippet: ["title:18"],
    },
  });

  return {
    configured: true,
    hits: result.hits,
    facets: result.facets ?? {},
    page: result.page ?? input.page,
    nbPages: result.nbPages ?? 0,
    nbHits: result.nbHits ?? 0,
  };
}

export async function getProductBySlug(slug: string) {
  if (!isAlgoliaConfigured()) {
    return null;
  }

  const result = await getClient().searchSingleIndex<CatalogHit>({
    indexName: process.env.ALGOLIA_PRODUCTS_INDEX ?? "products",
    searchParams: {
      query: "",
      hitsPerPage: 1,
      filters: `slug:"${escapeFilter(slug)}"`,
    },
  });

  return result.hits[0] ?? null;
}

export async function getFitmentFacetOptions(
  selection: VehicleSelection,
  facet: "fitmentYears" | "fitmentMakes" | "fitmentModels" | "fitmentVariants",
) {
  if (!isAlgoliaConfigured()) {
    return { configured: false, options: [] as string[] };
  }

  const result = await getClient().searchSingleIndex<CatalogHit>({
    indexName: process.env.ALGOLIA_PRODUCTS_INDEX ?? "products",
    searchParams: {
      query: "",
      hitsPerPage: 0,
      filters: buildAlgoliaFitmentFilter(selection) || undefined,
      facets: [facet],
      maxValuesPerFacet: 200,
    },
  });

  const options = Object.keys(result.facets?.[facet] ?? {}).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  return { configured: true, options };
}

export async function saveProductToSearchIndex(product: CatalogHit) {
  if (!process.env.ALGOLIA_ADMIN_API_KEY || !process.env.ALGOLIA_APP_ID) {
    throw new Error("Algolia admin credentials are required to index products.");
  }

  await algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_API_KEY).saveObject({
    indexName: process.env.ALGOLIA_PRODUCTS_INDEX ?? "products",
    body: product,
  });
}

function escapeFilter(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
