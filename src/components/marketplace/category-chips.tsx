import Link from "next/link";
import { ChevronRight, Grid2X2 } from "lucide-react";

import type { MarketplaceCategory } from "@/components/marketplace/category-card";
import { getCategoryIcon } from "@/lib/marketplace/category-icons";
import { cn } from "@/lib/utils";

export function CategoryChips({
  activeSlug,
  categories,
  totalCount,
}: {
  activeSlug?: string;
  categories: MarketplaceCategory[];
  totalCount: number;
}) {
  return (
    <nav aria-label="Marketplace categories" className="scrollbar-none overflow-x-auto pb-1">
      <div className="flex min-w-max items-center gap-2">
        <Link
          aria-label={`View all ${totalCount} active categories`}
          aria-current={!activeSlug ? "page" : undefined}
          className={cn(
            "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            !activeSlug
              ? "border-primary bg-primary text-white"
              : "border-stone-300 bg-white text-stone-700",
          )}
          href="/categories"
        >
          <Grid2X2 aria-hidden="true" className="size-4" />
          All categories ({totalCount})
        </Link>
        {categories.map((category) => {
          const Icon = getCategoryIcon(category.label);
          const active = activeSlug === category.slug;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active
                  ? "border-primary bg-primary text-white"
                  : "border-stone-300 bg-white text-stone-700",
              )}
              href={`/categories/${category.slug}`}
              key={category.id}
            >
              <Icon aria-hidden="true" className="size-4" />
              {category.label}
            </Link>
          );
        })}
        <Link
          aria-label="Open the complete category directory"
          className="grid size-11 place-items-center rounded-full border border-stone-300 bg-white text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          href="/categories"
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </Link>
      </div>
    </nav>
  );
}
