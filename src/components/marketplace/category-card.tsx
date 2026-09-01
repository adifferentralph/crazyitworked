import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  getCategoryIcon,
  getCategoryIconKey,
} from "@/lib/marketplace/category-icons";
import { cn } from "@/lib/utils";

export type MarketplaceCategory = {
  description?: string;
  id: string;
  label: string;
  slug: string;
};

export function CategoryCard({
  category,
  compact = false,
}: {
  category: MarketplaceCategory;
  compact?: boolean;
}) {
  const Icon = getCategoryIcon(category.label);
  const iconKey = getCategoryIconKey(category.label);

  return (
    <Link
      className={cn(
        "group flex border border-stone-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        compact
          ? "min-h-28 flex-col justify-between rounded-lg p-3"
          : "min-h-44 flex-col rounded-xl p-5",
      )}
      href={`/categories/${category.slug}`}
    >
      <span
        className="grid size-10 place-items-center rounded-lg bg-stone-950 text-white"
        data-category-icon={iconKey}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className={cn("font-body font-bold text-stone-950", compact ? "mt-4 text-sm leading-tight" : "mt-6 text-lg")}>
        {category.label}
      </span>
      {!compact && category.description ? (
        <span className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
          {category.description}
        </span>
      ) : null}
      {!compact ? (
        <span className="mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-primary">
          Browse parts
          <ArrowRight aria-hidden="true" className="size-4" />
        </span>
      ) : null}
    </Link>
  );
}
