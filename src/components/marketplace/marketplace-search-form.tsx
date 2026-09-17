"use client";

import Link from "next/link";
import { Search, Store } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import type { MarketplaceSearch } from "@/lib/marketplace/search-options";

type Suggestion = { id: string; name: string; slug: string };
type StoreSuggestion = { seller_id: string; slug: string; store_name: string };
type VehicleSuggestion = { id: string; label: string };
type Suggestions = {
  categories: Suggestion[];
  products: Suggestion[];
  stores: StoreSuggestion[];
  vehicles: VehicleSuggestion[];
};

const emptySuggestions: Suggestions = {
  categories: [],
  products: [],
  stores: [],
  vehicles: [],
};

function hasString(value: object, key: string): value is Record<string, string> {
  return key in value && typeof Reflect.get(value, key) === "string";
}

function parseSuggestions(value: unknown): Suggestions {
  if (typeof value !== "object" || value === null) return emptySuggestions;
  const categories =
    "categories" in value && Array.isArray(value.categories)
      ? value.categories.filter(
          (item): item is Suggestion =>
            typeof item === "object" &&
            item !== null &&
            hasString(item, "id") &&
            hasString(item, "name") &&
            hasString(item, "slug"),
        )
      : [];
  const products =
    "products" in value && Array.isArray(value.products)
      ? value.products.filter(
          (item): item is Suggestion =>
            typeof item === "object" &&
            item !== null &&
            hasString(item, "id") &&
            hasString(item, "name") &&
            hasString(item, "slug"),
        )
      : [];
  const stores =
    "stores" in value && Array.isArray(value.stores)
      ? value.stores.filter(
          (item): item is StoreSuggestion =>
            typeof item === "object" &&
            item !== null &&
            hasString(item, "seller_id") &&
            hasString(item, "store_name") &&
            hasString(item, "slug"),
        )
      : [];
  const vehicles =
    "vehicles" in value && Array.isArray(value.vehicles)
      ? value.vehicles.filter(
          (item): item is VehicleSuggestion =>
            typeof item === "object" &&
            item !== null &&
            hasString(item, "id") &&
            hasString(item, "label"),
        )
      : [];

  return { categories, products, stores, vehicles };
}

export function MarketplaceSearchForm({
  actionPath,
  preserveCategory = false,
  preserveVehicle = true,
  search,
}: {
  actionPath: string;
  preserveCategory?: boolean;
  preserveVehicle?: boolean;
  search: MarketplaceSearch;
}) {
  const listId = useId();
  const [query, setQuery] = useState(search.q ?? "");
  const [suggestions, setSuggestions] = useState(emptySuggestions);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) {
      setSuggestions(emptySuggestions);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(
        "/api/marketplace/search-suggestions?q=" + encodeURIComponent(normalized),
        { signal: controller.signal },
      )
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: unknown) => {
          if (controller.signal.aborted) return;
          const next = parseSuggestions(payload);
          setSuggestions(next);
          setOpen(
            next.stores.length +
              next.products.length +
              next.categories.length +
              next.vehicles.length >
              0,
          );
        })
        .catch(() => undefined);
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <form action={actionPath} className="flex flex-col gap-3 sm:flex-row" method="get" role="search">
      {preserveCategory && search.category ? <input name="category" type="hidden" value={search.category} /> : null}
      {preserveVehicle && search.vehicle ? <input name="vehicle" type="hidden" value={search.vehicle} /> : null}
      <div className="relative flex-1">
        <label className="relative block">
          <span className="sr-only">Search part name, OEM number, vehicle, or seller</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-stone-500" />
          <input
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={open}
            autoComplete="off"
            className="h-14 w-full rounded-md border border-stone-300 bg-white pl-12 pr-4 text-base outline-none placeholder:text-stone-500 focus:border-primary focus:ring-2 focus:ring-primary/20"
            name="q"
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setOpen(true)}
            placeholder="Search parts, OEM number, vehicle, or store..."
            role="combobox"
            type="search"
            value={query}
          />
        </label>
        {open ? (
          <div className="absolute inset-x-0 z-40 mt-1 max-h-96 overflow-y-auto rounded-lg border border-stone-200 bg-white p-2 shadow-xl" id={listId} role="listbox">
            {suggestions.stores.length > 0 ? (
              <SuggestionGroup label="Stores">
                {suggestions.stores.map((store) => (
                  <Link className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-stone-800 focus:bg-stone-100" href={`/store/${store.slug}`} key={store.seller_id} role="option">
                    <Store aria-hidden="true" className="size-4 text-primary" />
                    {store.store_name}
                  </Link>
                ))}
              </SuggestionGroup>
            ) : null}
            {suggestions.products.length > 0 ? (
              <SuggestionGroup label="Products">
                {suggestions.products.map((product) => (
                  <Link className="block rounded-md px-3 py-2 text-sm text-stone-800 focus:bg-stone-100" href={`/parts/${product.slug}`} key={product.id} role="option">{product.name}</Link>
                ))}
              </SuggestionGroup>
            ) : null}
            {suggestions.categories.length > 0 ? (
              <SuggestionGroup label="Categories">
                {suggestions.categories.map((category) => (
                  <Link className="block rounded-md px-3 py-2 text-sm text-stone-800 focus:bg-stone-100" href={`/categories/${category.slug}`} key={category.id} role="option">{category.name}</Link>
                ))}
              </SuggestionGroup>
            ) : null}
            {suggestions.vehicles.length > 0 ? (
              <SuggestionGroup label="Vehicles">
                {suggestions.vehicles.map((vehicle) => (
                  <Link className="block rounded-md px-3 py-2 text-sm text-stone-800 focus:bg-stone-100" href={`${actionPath}?q=${encodeURIComponent(vehicle.label)}`} key={vehicle.id} role="option">{vehicle.label}</Link>
                ))}
              </SuggestionGroup>
            ) : null}
          </div>
        ) : null}
      </div>
      <Button className="h-14 px-7" type="submit">
        <Search aria-hidden="true" className="size-5" />
        Search
      </Button>
    </form>
  );
}

function SuggestionGroup({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <section className="py-1">
      <h2 className="px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">{label}</h2>
      {children}
    </section>
  );
}
