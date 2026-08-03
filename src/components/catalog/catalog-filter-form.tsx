import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, africanMarkets } from "@/lib/marketplace/taxonomy";

export function CatalogFilterForm({ searchParams }: { searchParams: Record<string, string> }) {
  return (
    <form action="/marketplace" className="grid gap-3 rounded-lg border bg-white p-4 shadow-soft">
      <label className="grid gap-1 text-sm font-medium">
        Search
        <Input name="query" defaultValue={searchParams.query} placeholder="Part, SKU, OEM" />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Category
        <select
          name="category"
          defaultValue={searchParams.category ?? ""}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Location
        <select
          name="location"
          defaultValue={searchParams.location ?? ""}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All markets</option>
          {africanMarkets.map((market) => (
            <option key={market} value={market}>
              {market}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-sm font-medium">
          Min
          <Input name="minPrice" defaultValue={searchParams.minPrice} inputMode="numeric" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Max
          <Input name="maxPrice" defaultValue={searchParams.maxPrice} inputMode="numeric" />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium">
        Availability
        <select
          name="availability"
          defaultValue={searchParams.availability ?? ""}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Any stock status</option>
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock</option>
          <option value="preorder">Preorder</option>
        </select>
      </label>
      {["year", "make", "model", "variant"].map((key) =>
        searchParams[key] ? (
          <input key={key} type="hidden" name={key} value={searchParams[key]} />
        ) : null,
      )}
      <Button type="submit">
        <Search className="size-4" aria-hidden="true" />
        Apply filters
      </Button>
    </form>
  );
}
