import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MarketplaceSearch } from "@/lib/marketplace/search-options";

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
  return (
    <form
      action={actionPath}
      className="flex flex-col gap-3 sm:flex-row"
      method="get"
      role="search"
    >
      {preserveCategory && search.category ? (
        <input name="category" type="hidden" value={search.category} />
      ) : null}
      {preserveVehicle && search.vehicle ? (
        <input name="vehicle" type="hidden" value={search.vehicle} />
      ) : null}
      <label className="relative flex-1">
        <span className="sr-only">
          Search part name, OEM number, vehicle, or seller
        </span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-stone-500"
        />
        <input
          className="h-14 w-full rounded-md border border-stone-300 bg-white pl-12 pr-4 text-base outline-none placeholder:text-stone-500 focus:border-primary focus:ring-2 focus:ring-primary/20"
          defaultValue={search.q}
          name="q"
          placeholder="Search brake pads, OEM number, Toyota Camry..."
          type="search"
        />
      </label>
      <Button className="h-14 px-7" type="submit">
        <Search aria-hidden="true" className="size-5" />
        Search parts
      </Button>
    </form>
  );
}
