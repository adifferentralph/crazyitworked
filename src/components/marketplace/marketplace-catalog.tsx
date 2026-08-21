import Link from "next/link";
import {
  Armchair,
  BatteryCharging,
  CircleGauge,
  Disc3,
  Gauge,
  Lightbulb,
  PackageSearch,
  RotateCcw,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { DemandSignalReporter } from "@/components/marketplace/demand-signal-reporter";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import { MarketplaceSearchForm } from "@/components/marketplace/marketplace-search-form";
import { ProductCard } from "@/components/marketplace/product-card";
import { Button } from "@/components/ui/button";
import { getDefaultBuyerVehicleId } from "@/lib/marketplace/buyer-data";
import {
  getMarketplaceOptions,
  parseMarketplaceSearch,
  searchMarketplaceProducts,
} from "@/lib/marketplace/public-catalog";

const categoryIcons: Array<{ icon: LucideIcon; pattern: RegExp }> = [
  { icon: Disc3, pattern: /brake/i },
  { icon: Settings, pattern: /engine/i },
  { icon: Wrench, pattern: /suspension|steering/i },
  { icon: BatteryCharging, pattern: /electrical/i },
  { icon: Lightbulb, pattern: /body|lighting/i },
  { icon: Gauge, pattern: /transmission/i },
  { icon: CircleGauge, pattern: /wheel|tyre/i },
  { icon: Armchair, pattern: /interior|accessor/i },
];

function getCategoryIcon(label: string) {
  return categoryIcons.find((item) => item.pattern.test(label))?.icon ?? Wrench;
}

export async function MarketplaceCatalog({
  actionPath,
  buyerId,
  buyerName,
  searchParams,
}: {
  actionPath: "/find-a-part" | "/marketplace";
  buyerId?: string;
  buyerName?: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const search = parseMarketplaceSearch(raw);
  const [options, result, defaultVehicleId] = await Promise.all([
    getMarketplaceOptions(),
    searchMarketplaceProducts(search),
    buyerId ? getDefaultBuyerVehicleId(buyerId) : undefined,
  ]);
  const selectedVehicle = options.vehicles.find((vehicle) => vehicle.id === search.vehicle);
  const pages = Math.max(1, Math.ceil(result.count / result.pageSize));
  const firstName = buyerName?.trim().split(/\s+/)[0];
  const activeSearch = Boolean(
    search.q ||
      search.category ||
      search.vehicle ||
      search.brand ||
      search.location ||
      search.condition ||
      search.minPrice ||
      search.maxPrice ||
      search.availability ||
      search.pickup ||
      search.delivery,
  );
  const topCategories = options.categories.filter((category) => !category.parentId).slice(0, 12);
  const demandSignal = activeSearch ? {
    categoryId: search.category,
    eventType: result.count === 0 ? "ZERO_RESULT_SEARCH" as const : "ABANDONED_FILTERED_SEARCH" as const,
    fitmentId: search.vehicle,
    location: search.location,
    query: search.q,
    resultCount: result.count,
  } : null;

  return (
    <section className="min-h-[70vh] bg-white py-8 sm:py-10">
      {demandSignal ? <DemandSignalReporter signal={demandSignal} /> : null}
      <div className="container-page">
        <header className="max-w-3xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">
            {buyerName ? "Your automotive marketplace" : "Approved marketplace"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-5xl">
            {firstName ? `What part do you need, ${firstName}?` : "Find the right part for your vehicle."}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
            Search by part name or number, then use your exact vehicle to narrow compatible seller listings.
          </p>
        </header>

        <div className="mt-7 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:p-6">
          <MarketplaceSearchForm actionPath={actionPath} defaultVehicleId={defaultVehicleId} options={options} search={search} />
        </div>
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold text-stone-950">Cannot find the exact listing?</p><p className="mt-1 text-xs text-stone-600">Send one structured request to matched verified suppliers.</p></div>
          <Button asChild size="sm" variant="outline"><Link href={buyerName ? "/account/requests/new" : "/login?next=/account/requests/new"}>Request a part</Link></Button>
        </div>

        {buyerName && topCategories.length ? (
          <section className="mt-9 scroll-mt-28" id="categories">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">Browse by system</p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-950">Parts categories</h2>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {topCategories.map((category) => {
                const Icon = getCategoryIcon(category.label);
                return (
                  <Link
                    className="flex min-h-28 flex-col justify-between rounded-lg border border-stone-200 bg-white p-4 focus-visible:ring-2 focus-visible:ring-primary"
                    href={`${actionPath}?category=${category.id}`}
                    key={category.id}
                  >
                    <span className="grid size-9 place-items-center rounded-md bg-black text-white">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="mt-4 text-sm font-semibold leading-tight text-stone-900">{category.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <div className="mt-10 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <MarketplaceFilters actionPath={actionPath} options={options} search={search} />
          <div className="min-w-0">
            <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-stone-500">
                  {result.count} approved {result.count === 1 ? "part" : "parts"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-950 sm:text-3xl">
                  {search.q
                    ? `Results for “${search.q}”`
                    : selectedVehicle
                      ? `Parts listed for ${selectedVehicle.label}`
                      : buyerName
                        ? "Recently added parts"
                        : "Marketplace parts"}
                </h2>
              </div>
              {activeSearch ? (
                <Button asChild size="sm" variant="ghost">
                  <Link href={actionPath}>
                    <RotateCcw aria-hidden="true" className="size-4" />
                    Clear filters
                  </Link>
                </Button>
              ) : null}
            </div>

            {result.products.length ? (
              <div className="mt-5 grid gap-4 min-[520px]:grid-cols-2 xl:grid-cols-3">
                {result.products.map((product) => (
                  <ProductCard canPurchase={Boolean(buyerName)} key={product.id} product={product} vehicle={selectedVehicle} />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-5 py-14 text-center">
                <PackageSearch aria-hidden="true" className="mx-auto size-9 text-stone-400" />
                <h2 className="mt-4 text-2xl font-semibold text-stone-950">No matching parts yet</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">
                  Try a broader part name, remove a filter, or search using an OEM or manufacturer number.
                </p>
                <Button asChild className="mt-5" variant="outline">
                  <Link href={actionPath}>Reset search</Link>
                </Button>
              </div>
            )}

            {pages > 1 ? (
              <nav aria-label="Search result pages" className="mt-9 flex justify-center gap-2">
                {Array.from({ length: Math.min(pages, 10) }, (_, index) => index + 1).map((page) => {
                  const params = new URLSearchParams();
                  for (const [key, value] of Object.entries(raw)) {
                    if (typeof value === "string" && key !== "page") params.set(key, value);
                  }
                  params.set("page", String(page));
                  return (
                    <Button asChild key={page} size="sm" variant={page === search.page ? "default" : "outline"}>
                      <Link aria-current={page === search.page ? "page" : undefined} href={`${actionPath}?${params.toString()}`}>
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