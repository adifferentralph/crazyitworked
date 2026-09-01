import Link from "next/link";
import { PackageSearch, RotateCcw } from "lucide-react";

import { DemandSignalReporter } from "@/components/marketplace/demand-signal-reporter";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import { MarketplaceSearchForm } from "@/components/marketplace/marketplace-search-form";
import { MobileMarketplaceControls } from "@/components/marketplace/mobile-marketplace-controls";
import { ProductCard } from "@/components/marketplace/product-card";
import { Button } from "@/components/ui/button";
import {
  getMarketplaceOptions,
  parseMarketplaceSearch,
  searchMarketplaceProducts,
} from "@/lib/marketplace/public-catalog";

export async function MarketplaceCatalog({
  actionPath,
  buyerName,
  forcedCategoryId,
  searchParams,
}: {
  actionPath: string;
  buyerName?: string;
  forcedCategoryId?: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsedSearch = parseMarketplaceSearch(raw);
  const search = forcedCategoryId
    ? { ...parsedSearch, category: forcedCategoryId }
    : parsedSearch;
  const [options, result] = await Promise.all([
    getMarketplaceOptions(),
    searchMarketplaceProducts(search),
  ]);
  const selectedVehicle = options.vehicles.find(
    (vehicle) => vehicle.id === search.vehicle,
  );
  const selectedCategory = options.categories.find(
    (category) => category.id === search.category,
  );
  const pages = Math.max(1, Math.ceil(result.count / result.pageSize));
  const activeSearch = Boolean(
    search.q ||
      search.category ||
      search.vehicle ||
      search.brand ||
      search.seller ||
      search.location ||
      search.condition ||
      search.minPrice ||
      search.maxPrice ||
      search.availability ||
      search.pickup ||
      search.delivery,
  );
  const demandSignal = activeSearch
    ? {
        categoryId: search.category,
        eventType:
          result.count === 0
            ? ("ZERO_RESULT_SEARCH" as const)
            : ("ABANDONED_FILTERED_SEARCH" as const),
        fitmentId: search.vehicle,
        location: search.location,
        query: search.q,
        resultCount: result.count,
      }
    : null;
  const resultTitle = search.q
    ? `Results for “${search.q}”`
    : selectedVehicle
      ? `Parts listed for ${selectedVehicle.label}`
      : selectedCategory
        ? `${selectedCategory.label} parts`
        : "Marketplace parts";

  return (
    <section className="min-h-[70vh] bg-white py-6 sm:py-10">
      {demandSignal ? <DemandSignalReporter signal={demandSignal} /> : null}
      <div className="container-page">
        <header className="max-w-3xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Approved marketplace inventory
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-5xl">
            {resultTitle}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
            Search by part name or number, then narrow real seller listings by
            vehicle, condition, brand, seller, price, and location.
          </p>
        </header>

        <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-3 sm:p-5">
          <MarketplaceSearchForm
            actionPath={actionPath}
            preserveCategory={Boolean(forcedCategoryId)}
            search={search}
          />
        </div>

        <div className="mt-4 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-sm font-bold text-stone-950">
              Cannot find the exact listing?
            </p>
            <p className="mt-1 text-xs leading-5 text-stone-600">
              Send one structured request to matched suppliers.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link
              href={
                buyerName
                  ? "/account/requests/new"
                  : "/login?next=/account/requests/new"
              }
            >
              Request a part
            </Link>
          </Button>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <MarketplaceFilters
            actionPath={actionPath}
            lockedCategoryId={forcedCategoryId}
            options={options}
            search={search}
          />
          <div className="min-w-0">
            <div className="border-b border-stone-200 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-500">
                    {result.count} approved{" "}
                    {result.count === 1 ? "part" : "parts"}
                  </p>
                  <h2 className="mt-1 font-body text-xl font-bold text-stone-950 sm:text-2xl">
                    {resultTitle}
                  </h2>
                </div>
                {activeSearch ? (
                  <Button
                    asChild
                    className="hidden lg:inline-flex"
                    size="sm"
                    variant="ghost"
                  >
                    <Link href={actionPath}>
                      <RotateCcw aria-hidden="true" className="size-4" />
                      Clear filters
                    </Link>
                  </Button>
                ) : null}
              </div>
              <div className="mt-4">
                <MobileMarketplaceControls
                  actionPath={actionPath}
                  lockedCategoryId={forcedCategoryId}
                  options={options}
                  search={search}
                />
              </div>
            </div>

            {result.products.length > 0 ? (
              <div className="mt-5 grid gap-4 min-[520px]:grid-cols-2 xl:grid-cols-3">
                {result.products.map((product) => (
                  <ProductCard
                    canPurchase={Boolean(buyerName)}
                    key={product.id}
                    product={product}
                    vehicle={selectedVehicle}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-5 py-14 text-center">
                <PackageSearch
                  aria-hidden="true"
                  className="mx-auto size-9 text-stone-400"
                />
                <h2 className="mt-4 text-2xl font-semibold text-stone-950">
                  No matching parts yet
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">
                  Try a broader part name, remove a filter, or search using an
                  OEM or manufacturer number.
                </p>
                <Button asChild className="mt-5" variant="outline">
                  <Link href={actionPath}>Clear filters</Link>
                </Button>
              </div>
            )}

            {pages > 1 ? (
              <nav
                aria-label="Search result pages"
                className="mt-9 flex flex-wrap justify-center gap-2"
              >
                {Array.from(
                  { length: Math.min(pages, 10) },
                  (_, index) => index + 1,
                ).map((page) => {
                  const params = new URLSearchParams();
                  for (const [key, value] of Object.entries(raw)) {
                    if (typeof value === "string" && key !== "page") {
                      params.set(key, value);
                    }
                  }
                  params.set("page", String(page));
                  return (
                    <Button
                      asChild
                      key={page}
                      size="sm"
                      variant={page === search.page ? "default" : "outline"}
                    >
                      <Link
                        aria-current={
                          page === search.page ? "page" : undefined
                        }
                        href={`${actionPath}?${params.toString()}`}
                      >
                        {page}
                      </Link>
                    </Button>
                  );
                })}
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
