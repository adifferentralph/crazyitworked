import type { ReactNode } from "react";

import {
  publicProductConditions,
  type MarketplaceOptions,
  type MarketplaceSearch,
} from "@/lib/marketplace/search-options";

export type { MarketplaceOptions } from "@/lib/marketplace/search-options";

const inputClass =
  "mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm font-normal text-stone-950 outline-none focus-visible:ring-2 focus-visible:ring-primary/20";

function conditionLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function MarketplaceSearchHiddenInputs({
  exclude = [],
  search,
}: {
  exclude?: Array<keyof MarketplaceSearch>;
  search: MarketplaceSearch;
}) {
  const excluded = new Set(exclude);
  const entries: Array<[keyof MarketplaceSearch, string | number | undefined]> = [
    ["availability", search.availability],
    ["brand", search.brand],
    ["category", search.category],
    ["condition", search.condition],
    ["delivery", search.delivery],
    ["location", search.location],
    ["maxPrice", search.maxPrice === undefined ? undefined : search.maxPrice / 100],
    ["minPrice", search.minPrice === undefined ? undefined : search.minPrice / 100],
    ["pickup", search.pickup],
    ["q", search.q],
    ["seller", search.seller],
    ["vehicle", search.vehicle],
  ];

  return entries.flatMap(([name, value]) =>
    excluded.has(name) || value === undefined || value === ""
      ? []
      : [
          <input
            key={name}
            name={name}
            type="hidden"
            value={String(value)}
          />,
        ],
  );
}

export function MarketplaceFilterFields({
  includeSort = false,
  lockedCategoryId,
  options,
  search,
}: {
  includeSort?: boolean;
  lockedCategoryId?: string;
  options: MarketplaceOptions;
  search: MarketplaceSearch;
}) {
  return (
    <>
      {search.q ? <input name="q" type="hidden" value={search.q} /> : null}
      {lockedCategoryId ? (
        <input name="category" type="hidden" value={lockedCategoryId} />
      ) : (
        <FilterLabel label="Category">
          <select
            className={inputClass}
            defaultValue={search.category ?? ""}
            name="category"
          >
            <option value="">All categories</option>
            {options.categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </FilterLabel>
      )}
      <FilterLabel label="Vehicle">
        <select
          className={inputClass}
          defaultValue={search.vehicle ?? ""}
          name="vehicle"
        >
          <option value="">All compatible vehicles</option>
          {options.vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.label}
            </option>
          ))}
        </select>
      </FilterLabel>
      <FilterLabel label="Condition">
        <select
          className={inputClass}
          defaultValue={search.condition ?? ""}
          name="condition"
        >
          <option value="">Any condition</option>
          {publicProductConditions.map((condition) => (
            <option key={condition} value={condition}>
              {conditionLabel(condition)}
            </option>
          ))}
        </select>
      </FilterLabel>
      <FilterLabel label="Brand">
        <select
          className={inputClass}
          defaultValue={search.brand ?? ""}
          name="brand"
        >
          <option value="">All brands</option>
          {options.brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </FilterLabel>
      <FilterLabel label="Seller">
        <select
          className={inputClass}
          defaultValue={search.seller ?? ""}
          name="seller"
        >
          <option value="">All approved sellers</option>
          {options.sellers.map((seller) => (
            <option key={seller.seller_id} value={seller.seller_id}>
              {seller.store_name}
            </option>
          ))}
        </select>
      </FilterLabel>
      <FilterLabel label="Location">
        <select
          className={inputClass}
          defaultValue={search.location ?? ""}
          name="location"
        >
          <option value="">All locations</option>
          {options.locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </FilterLabel>
      <div className="grid grid-cols-2 gap-3">
        <FilterLabel label="Min NGN">
          <input
            className={inputClass}
            defaultValue={
              search.minPrice === undefined ? "" : search.minPrice / 100
            }
            inputMode="decimal"
            name="minPrice"
          />
        </FilterLabel>
        <FilterLabel label="Max NGN">
          <input
            className={inputClass}
            defaultValue={
              search.maxPrice === undefined ? "" : search.maxPrice / 100
            }
            inputMode="decimal"
            name="maxPrice"
          />
        </FilterLabel>
      </div>
      {includeSort ? (
        <FilterLabel label="Sort by">
          <select
            className={inputClass}
            defaultValue={search.sort}
            name="sort"
          >
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </FilterLabel>
      ) : null}
      <div className="grid gap-3 border-t border-stone-200 pt-4 text-sm text-stone-700">
        <CheckFilter
          checked={Boolean(search.availability)}
          label="In stock only"
          name="availability"
          value="in-stock"
        />
        <CheckFilter
          checked={Boolean(search.pickup)}
          label="Pickup available"
          name="pickup"
          value="true"
        />
        <CheckFilter
          checked={Boolean(search.delivery)}
          label="Delivery available"
          name="delivery"
          value="true"
        />
      </div>
    </>
  );
}

function FilterLabel({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="text-sm font-semibold text-stone-700">
      {label}
      {children}
    </label>
  );
}

function CheckFilter({
  checked,
  label,
  name,
  value,
}: {
  checked: boolean;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        className="size-4 accent-primary"
        defaultChecked={checked}
        name={name}
        type="checkbox"
        value={value}
      />
      {label}
    </label>
  );
}
