import Link from "next/link";
import { Filter } from "lucide-react";

import { MarketplaceFilterFields } from "@/components/marketplace/marketplace-filter-fields";
import { Button } from "@/components/ui/button";
import type {
  MarketplaceSearch,
  getMarketplaceOptions,
} from "@/lib/marketplace/public-catalog";

type Options = Awaited<ReturnType<typeof getMarketplaceOptions>>;

export function MarketplaceFilters({
  actionPath,
  lockedCategoryId,
  options,
  search,
}: {
  actionPath: string;
  lockedCategoryId?: string;
  options: Options;
  search: MarketplaceSearch;
}) {
  return (
    <aside
      aria-label="Marketplace filters"
      className="hidden self-start rounded-lg border border-stone-200 bg-stone-50 lg:sticky lg:top-24 lg:block"
    >
      <div className="flex items-center gap-2 border-b border-stone-200 px-4 py-3">
        <Filter aria-hidden="true" className="size-4 text-primary" />
        <h2 className="font-body text-sm font-bold text-stone-950">
          Filter parts
        </h2>
      </div>
      <form action={actionPath} className="grid gap-4 p-4" method="get">
        <MarketplaceFilterFields
          includeSort
          lockedCategoryId={lockedCategoryId}
          options={options}
          search={search}
        />
        <div className="grid grid-cols-2 gap-2 border-t border-stone-200 pt-4">
          <Button asChild size="sm" variant="ghost">
            <Link href={actionPath}>Clear</Link>
          </Button>
          <Button size="sm" type="submit">
            Apply
          </Button>
        </div>
      </form>
    </aside>
  );
}
