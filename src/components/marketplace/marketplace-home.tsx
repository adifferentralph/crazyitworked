import Link from "next/link";
import {
  ArrowRight,
  CarFront,
  FileQuestion,
  MapPin,
  Search,
} from "lucide-react";

import { CategoryCard } from "@/components/marketplace/category-card";
import { MarketplaceSearchForm } from "@/components/marketplace/marketplace-search-form";
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
    .slice(0, 8);
  const defaultVehicle = options.vehicles.find(
    (vehicle) => vehicle.id === defaultVehicleId,
  );
  const vehicleHref = buyer
    ? "/account/vehicles"
    : "/login?next=/account/vehicles";
  const requestHref = buyer
    ? "/account/requests/new"
    : "/login?next=/account/requests/new";

  return (
    <div className="bg-white">
      <section className="border-b border-stone-200 bg-[#fffdf9] py-7 sm:py-12">
        <div className="container-page">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Automotive parts marketplace
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-stone-950 sm:text-5xl">
              Find the exact part. Faster.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
              Search approved listings by part name, OEM number, or vehicle.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:p-5">
            <MarketplaceSearchForm
              actionPath="/find-a-part"
              preserveVehicle={false}
              search={recentSearch}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-3 text-stone-700">
              <MapPin aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="truncate">Deliver to Nigeria</span>
            </div>
            <Link
              className="flex min-w-0 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-3 font-semibold text-stone-800 focus-visible:ring-2 focus-visible:ring-primary"
              href={vehicleHref}
            >
              <CarFront aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="truncate">
                {defaultVehicle ? "My vehicle" : "Add my vehicle"}
              </span>
            </Link>
          </div>
        </div>
      </section>

      {options.vehicles.length > 0 ? (
        <section className="py-8 sm:py-12">
          <div className="container-page">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">
                  Vehicle-first search
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-950 sm:text-3xl">
                  Find parts for your vehicle
                </h2>
              </div>
            </div>
            <form action="/find-a-part" method="get">
              <VehicleSearch
                initialVehicle={defaultVehicleId}
                vehicles={options.vehicles}
              />
              <Button className="mt-4 w-full sm:w-auto" type="submit">
                <Search aria-hidden="true" className="size-4" />
                Find matching parts
              </Button>
            </form>
          </div>
        </section>
      ) : null}

      {topCategories.length > 0 ? (
        <section className="border-y border-stone-200 bg-stone-50 py-8 sm:py-12">
          <div className="container-page">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">
                  Useful shortcuts
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-950 sm:text-3xl">
                  Shop by category
                </h2>
              </div>
              <Link
                className="hidden items-center gap-2 text-sm font-semibold text-primary sm:flex"
                href="/categories"
              >
                View all categories
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {topCategories.map((category) => (
                <CategoryCard
                  category={category}
                  compact
                  key={category.id}
                />
              ))}
            </div>
            <Button asChild className="mt-5 w-full sm:hidden" variant="outline">
              <Link href="/categories">View all categories</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {recent.products.length > 0 ? (
        <section className="py-8 sm:py-12">
          <div className="container-page">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">
                  Live approved inventory
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-stone-950 sm:text-3xl">
                  Recently added
                </h2>
              </div>
              <Link
                className="hidden items-center gap-2 text-sm font-semibold text-primary sm:flex"
                href="/find-a-part?sort=newest"
              >
                View all parts
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
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
          </div>
        </section>
      ) : null}

      <section className="border-t border-stone-200 bg-[#fffdf9] py-8 sm:py-12">
        <div className="container-page">
          <div className="flex flex-col gap-5 rounded-xl border border-stone-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-stone-950 text-white">
                <FileQuestion aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="font-body text-xl font-bold text-stone-950">
                  Cannot find the exact part?
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
                  Send one structured request to matched suppliers instead of
                  repeating the same details.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0">
              <Link href={requestHref}>
                Request a part
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
