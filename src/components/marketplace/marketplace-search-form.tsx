import { Search } from "lucide-react";

import { VehicleSearch } from "@/components/marketplace/vehicle-search";
import { Button } from "@/components/ui/button";
import type { MarketplaceSearch } from "@/lib/marketplace/public-catalog";
import { getMarketplaceOptions } from "@/lib/marketplace/public-catalog";

type Options = Awaited<ReturnType<typeof getMarketplaceOptions>>;

export function MarketplaceSearchForm({
  actionPath,
  options,
  search,
}: {
  actionPath: string;
  options: Options;
  search: MarketplaceSearch;
}) {
  return (
    <form action={actionPath} className="grid gap-5" method="get" role="search">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search part name, OEM number, vehicle, or seller</span>
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
      </div>
      <VehicleSearch initialVehicle={search.vehicle} vehicles={options.vehicles} />
    </form>
  );
}