import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, PackageSearch } from "lucide-react";

import {
  getCategoryIcon,
  getCategoryIconKey,
} from "@/lib/marketplace/category-icons";
import { getMarketplaceOptions } from "@/lib/marketplace/public-catalog";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPublicMetadata({
  description:
    "Browse automotive parts by vehicle system, from brakes and engines to cooling, electrical, interior, and accessories.",
  path: "/categories",
  title: "Automotive parts categories",
});

export default async function CategoriesPage() {
  const options = await getMarketplaceOptions();
  const primaryCategories = options.categories.filter(
    (category) => !category.parentId,
  );

  return (
    <section className="min-h-[70vh] bg-white py-6 font-body sm:py-10">
      <div className="container-page">
        <header>
          <h1 className="font-body text-3xl font-bold text-stone-950">
            All categories
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            {options.categories.length} active{" "}
            {options.categories.length === 1 ? "category" : "categories"}
          </p>
        </header>

        {primaryCategories.length > 0 ? (
          <nav aria-label="Automotive category directory" className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
            {primaryCategories.map((category) => {
              const Icon = getCategoryIcon(category.label);
              const iconKey = getCategoryIconKey(category.label);
              return (
                <Link
                  className="flex min-h-16 items-center gap-4 border-b border-stone-200 px-4 text-stone-950 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:min-h-[4.5rem] sm:px-5"
                  href={`/categories/${category.slug}`}
                  key={category.id}
                >
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-lg bg-stone-950 text-white"
                    data-category-icon={iconKey}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 font-bold">{category.label}</span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-stone-400" />
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center">
            <PackageSearch aria-hidden="true" className="mx-auto size-8 text-stone-400" />
            <h2 className="mt-3 font-body text-xl font-bold text-stone-950">
              No categories yet
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Active automotive categories will appear here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
