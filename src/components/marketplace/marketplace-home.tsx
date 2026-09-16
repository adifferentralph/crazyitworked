import Link from "next/link";
import {
  ArrowRight,
  CarFront,
  FileQuestion,
  PackageSearch,
  Search,
} from "lucide-react";

import { CategoryChips } from "@/components/marketplace/category-chips";
import { MarketplaceBanners } from "@/components/marketplace/marketplace-banners";
import { MarketplaceSearchForm } from "@/components/marketplace/marketplace-search-form";
import { MarketplaceSortLinks } from "@/components/marketplace/marketplace-sort-links";
import { ProductCard } from "@/components/marketplace/product-card";
import { VehicleSearch } from "@/components/marketplace/vehicle-search";
import { Button } from "@/components/ui/button";
import { getCurrentPrincipal } from "@/lib/auth/principal";
import { getDefaultBuyerVehicleId } from "@/lib/marketplace/buyer-data";
import {
  getMarketplaceOptions,
  parseMarketplaceSearch,
  searchMarketplaceProducts,
} from "@/lib/marketplace/public-catalog";

export async function MarketplaceHome() {
  const principal = await getCurrentPrincipal();
  const buyer =
    principal?.role === "BUYER" && principal.status === "ACTIVE"
      ? principal
      : null;
  const recentSearch = parseMarketplaceSearch({ sort: "newest" });
  const [options, recent, defaultVehicleId] = await Promise.all([
    getMarketplaceOptions(),
    searchMarketplaceProducts(recentSearch, { pageSize: 8 }),
    buyer ? getDefaultBuyerVehicleId(buyer.id) : undefined,
  ]);
  const topCategories = options.categories
    .filter((category) => !category.parentId)
    .slice(0, 12);
  const defaultVehicle = options.vehicles.find(
    (vehicle) => vehicle.id === defaultVehicleId,
  );
  const requestHref = buyer
    ? "/account/requests/new"
    : "/login?next=/account/requests/new";

  return (
    <div className="bg-white font-body">
      {!principal ? (
        <section aria-label="Search marketplace" className="border-b border-stone-200 bg-[#fffdf9] py-4">
          <div className="container-page">
            <MarketplaceSearchForm
              actionPath="/find-a-part"
              preserveVehicle={false}
              search={recentSearch}
            />
          </div>
        </section>
      ) : null}

      <MarketplaceBanners placement="HOME_HERO" />

      {topCategories.length > 0 ? (
        <section className="border-y border-stone-200 bg-stone-50 py-6 sm:py-8">
          <div className="container-page">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="font-body text-xl font-bold text-stone-950 sm:text-2xl">
                Categories
              </h2>
              <Link className="text-sm font-bold text-primary" href="/categories">
                Directory
              </Link>
            </div>
            <CategoryChips
              categories={topCategories}
              totalCount={options.categories.length}
            />
          </div>
        </section>
      ) : null}

      {options.makes.length > 0 ? (
        <section className="py-7 sm:py-9">
          <div className="container-page">
            <div className="rounded-xl border border-stone-200 bg-[#fffdf9] p-4 sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-black text-white">
                  <CarFront aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="font-body text-xl font-bold text-stone-950">
                    Find parts for your car
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">
                    Choose your car to see compatible parts.
                  </p>
                </div>
              </div>
              <form action="/find-a-part" method="get">
                <VehicleSearch
                  initialVehicle={defaultVehicleId}
                  makes={options.makes}
                  vehicles={options.vehicles}
                />
                <Button className="mt-4 w-full sm:w-auto" type="submit">
                  <Search aria-hidden="true" className="size-4" />
                  Find parts
                </Button>
              </form>
            </div>
          </div>
        </section>
      ) : null}

      <MarketplaceBanners placement="HOME_MID" />

      <section className="border-t border-stone-200 py-7 sm:py-10">
        <div className="container-page">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-body text-2xl font-bold text-stone-950 sm:text-3xl">
                All Products
              </h2>
              <p className="mt-1 text-sm font-semibold text-stone-500">
                {recent.count} {recent.count === 1 ? "product" : "products"}
              </p>
            </div>
            {recent.count > recent.products.length ? (
              <Link className="hidden items-center gap-2 text-sm font-bold text-primary sm:flex" href="/find-a-part?sort=newest">
                View all
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            ) : null}
          </div>
          <div className="mt-4">
            <MarketplaceSortLinks
              actionPath="/find-a-part"
              raw={{}}
              selected={recentSearch.sort}
            />
          </div>

          {recent.products.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {recent.products.map((product) => (
                <ProductCard
                  canPurchase={Boolean(buyer)}
                  key={product.id}
                  product={product}
                  vehicle={defaultVehicle}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-5 py-12 text-center">
              <PackageSearch aria-hidden="true" className="mx-auto size-9 text-stone-400" />
              <h3 className="mt-4 font-body text-xl font-bold text-stone-950">
                No products yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
                Products from our sellers will appear here as they are added.
              </p>
              <p className="mt-4 text-sm font-semibold text-stone-800">
                Looking for something now?
              </p>
              <Button asChild className="mt-3" variant="outline">
                <Link href={requestHref}>
                  <FileQuestion aria-hidden="true" className="size-4" />
                  Request a part
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
