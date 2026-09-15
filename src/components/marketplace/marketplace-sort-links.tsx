import Link from "next/link";

import { cn } from "@/lib/utils";
import type { MarketplaceSearch } from "@/lib/marketplace/search-options";

const options = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low", value: "price-asc" },
  { label: "Price: High", value: "price-desc" },
  { label: "A–Z", value: "name-asc" },
] as const;

export function MarketplaceSortLinks({
  actionPath,
  raw,
  selected,
}: {
  actionPath: string;
  raw: Record<string, string | string[] | undefined>;
  selected: MarketplaceSearch["sort"];
}) {
  return (
    <nav aria-label="Sort marketplace products" className="overflow-x-auto">
      <div className="flex min-w-max gap-2">
        {options.map((option) => {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(raw)) {
            if (typeof value === "string" && key !== "page" && key !== "sort") params.set(key, value);
          }
          params.set("sort", option.value);
          const active = selected === option.value;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-bold",
                active ? "border-primary bg-primary text-white" : "border-stone-300 bg-white text-stone-700 hover:border-primary hover:text-primary",
              )}
              href={`${actionPath}?${params.toString()}`}
              key={option.value}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
