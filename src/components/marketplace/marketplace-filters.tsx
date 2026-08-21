import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MarketplaceSearch } from "@/lib/marketplace/public-catalog";
import {
  getMarketplaceOptions,
  publicProductConditions,
} from "@/lib/marketplace/public-catalog";

type Options = Awaited<ReturnType<typeof getMarketplaceOptions>>;
const inputClass =
  "mt-2 h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

export function MarketplaceFilters({
  actionPath,
  options,
  search,
}: {
  actionPath: string;
  options: Options;
  search: MarketplaceSearch;
}) {
  return (
    <aside aria-label="Marketplace filters" className="self-start rounded-lg border border-stone-200 bg-stone-50 lg:sticky lg:top-24">
      <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
        <Filter aria-hidden="true" className="size-4 text-primary" />
        <h2 className="font-body text-sm font-bold text-stone-950">Filter parts</h2>
      </div>
      <form action={actionPath} className="grid gap-4 p-4" method="get">
        {search.q ? <input name="q" type="hidden" value={search.q} /> : null}
        {search.vehicle ? <input name="vehicle" type="hidden" value={search.vehicle} /> : null}
        <label className="text-sm font-semibold text-stone-700">
          Category
          <select className={inputClass} defaultValue={search.category ?? ""} name="category">
            <option value="">All categories</option>
            {options.categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-stone-700">
          Condition
          <select className={inputClass} defaultValue={search.condition ?? ""} name="condition">
            <option value="">Any condition</option>
            {publicProductConditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition.replaceAll("_", " ").toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-stone-700">
          Brand
          <select className={inputClass} defaultValue={search.brand ?? ""} name="brand">
            <option value="">All brands</option>
            {options.brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-stone-700">
          Location
          <select className={inputClass} defaultValue={search.location ?? ""} name="location">
            <option value="">All locations</option>
            {options.locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-semibold text-stone-700">
            Min NGN
            <input className={inputClass} defaultValue={search.minPrice === undefined ? "" : search.minPrice / 100} inputMode="decimal" name="minPrice" />
          </label>
          <label className="text-sm font-semibold text-stone-700">
            Max NGN
            <input className={inputClass} defaultValue={search.maxPrice === undefined ? "" : search.maxPrice / 100} inputMode="decimal" name="maxPrice" />
          </label>
        </div>
        <label className="text-sm font-semibold text-stone-700">
          Sort by
          <select className={inputClass} defaultValue={search.sort} name="sort">
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
        <div className="grid gap-2 border-t border-stone-200 pt-4 text-sm text-stone-700">
          <label className="flex items-center gap-2">
            <input className="size-4 accent-primary" defaultChecked={Boolean(search.availability)} name="availability" type="checkbox" value="in-stock" />
            In stock only
          </label>
          <label className="flex items-center gap-2">
            <input className="size-4 accent-primary" defaultChecked={Boolean(search.pickup)} name="pickup" type="checkbox" value="true" />
            Pickup available
          </label>
          <label className="flex items-center gap-2">
            <input className="size-4 accent-primary" defaultChecked={Boolean(search.delivery)} name="delivery" type="checkbox" value="true" />
            Delivery available
          </label>
        </div>
        <Button className="w-full" type="submit">
          Apply filters
        </Button>
      </form>
    </aside>
  );
}