import { Filter, Search } from "lucide-react";

import { VehicleSearch } from "@/components/marketplace/vehicle-search";
import { Button } from "@/components/ui/button";
import type { MarketplaceSearch } from "@/lib/marketplace/public-catalog";
import { getMarketplaceOptions, publicProductConditions } from "@/lib/marketplace/public-catalog";

type Options = Awaited<ReturnType<typeof getMarketplaceOptions>>;
const inputClass = "h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function MarketplaceSearchForm({ options, search }: { options: Options; search: MarketplaceSearch }) {
  return (
    <form action="/find-a-part" className="grid gap-5" method="get">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Part name, OEM number, or vehicle</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-stone-500" aria-hidden="true" />
          <input className="h-14 w-full rounded-md border border-stone-300 bg-white pl-12 pr-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring" defaultValue={search.q} name="q" placeholder="Part name, OEM number, or vehicle" type="search" />
        </label>
        <Button className="h-14 px-7" type="submit"><Search className="size-5" aria-hidden="true" />Search parts</Button>
      </div>

      <VehicleSearch initialVehicle={search.vehicle} vehicles={options.vehicles} />

      <details className="rounded-lg border border-stone-200 bg-white" open={Boolean(search.category || search.brand || search.location || search.minPrice || search.maxPrice)}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold text-stone-900"><Filter className="size-4 text-primary" aria-hidden="true" />Filters and sorting</summary>
        <div className="grid gap-4 border-t border-stone-200 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-semibold text-stone-700">Category<select className={`${inputClass} mt-2`} defaultValue={search.category ?? ""} name="category"><option value="">All categories</option>{options.categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="text-sm font-semibold text-stone-700">Condition<select className={`${inputClass} mt-2`} defaultValue={search.condition ?? ""} name="condition"><option value="">Any condition</option>{publicProductConditions.map((condition) => <option key={condition} value={condition}>{condition.replaceAll("_", " ").toLowerCase()}</option>)}</select></label>
          <label className="text-sm font-semibold text-stone-700">Brand<select className={`${inputClass} mt-2`} defaultValue={search.brand ?? ""} name="brand"><option value="">All brands</option>{options.brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select></label>
          <label className="text-sm font-semibold text-stone-700">Location<select className={`${inputClass} mt-2`} defaultValue={search.location ?? ""} name="location"><option value="">All locations</option>{options.locations.map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
          <label className="text-sm font-semibold text-stone-700">Seller<select className={`${inputClass} mt-2`} defaultValue={search.seller ?? ""} name="seller"><option value="">All sellers</option>{options.sellers.map((seller) => <option key={seller.seller_id} value={seller.seller_id}>{seller.store_name}</option>)}</select></label>
          <label className="text-sm font-semibold text-stone-700">Minimum price (NGN)<input className={`${inputClass} mt-2`} defaultValue={search.minPrice === undefined ? "" : search.minPrice / 100} inputMode="decimal" name="minPrice" /></label>
          <label className="text-sm font-semibold text-stone-700">Maximum price (NGN)<input className={`${inputClass} mt-2`} defaultValue={search.maxPrice === undefined ? "" : search.maxPrice / 100} inputMode="decimal" name="maxPrice" /></label>
          <label className="text-sm font-semibold text-stone-700">Sort<select className={`${inputClass} mt-2`} defaultValue={search.sort} name="sort"><option value="relevance">Relevance</option><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select></label>
          <label className="flex items-center gap-2 text-sm text-stone-700"><input className="size-4 accent-primary" defaultChecked={Boolean(search.availability)} name="availability" type="checkbox" value="in-stock" />In stock only</label>
          <label className="flex items-center gap-2 text-sm text-stone-700"><input className="size-4 accent-primary" defaultChecked={Boolean(search.pickup)} name="pickup" type="checkbox" value="true" />Pickup available</label>
          <label className="flex items-center gap-2 text-sm text-stone-700"><input className="size-4 accent-primary" defaultChecked={Boolean(search.delivery)} name="delivery" type="checkbox" value="true" />Delivery available</label>
          <div className="flex items-end"><Button className="w-full" type="submit">Apply filters</Button></div>
        </div>
      </details>
    </form>
  );
}
