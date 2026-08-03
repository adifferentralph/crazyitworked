import type { Metadata } from "next";

import { CatalogFilterForm } from "@/components/catalog/catalog-filter-form";
import { ProductSearchResults } from "@/components/catalog/product-search-results";
import { VehicleFitmentFinder } from "@/components/vehicle/vehicle-fitment-finder";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Search automotive parts by SKU, OEM number, category, location, and fitment.",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MarketplacePage({ searchParams }: PageProps) {
  const params = normalizeSearchParams(await searchParams);

  return (
    <section className="container-page grid gap-6 py-8">
      <div className="grid gap-3">
        <h1 className="text-3xl font-semibold">Marketplace</h1>
        <VehicleFitmentFinder compact />
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
        <CatalogFilterForm searchParams={params} />
        <ProductSearchResults searchParams={params} />
      </div>
    </section>
  );
}

function normalizeSearchParams(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(params)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}
