import type { Metadata } from "next";

import { CategoryCard } from "@/components/marketplace/category-card";
import { getMarketplaceOptions } from "@/lib/marketplace/public-catalog";

export const metadata: Metadata = {
  description:
    "Browse automotive parts by vehicle system, from brakes and engines to cooling, electrical, interior, and accessories.",
  title: "Automotive parts categories",
};

export default async function CategoriesPage() {
  const options = await getMarketplaceOptions();
  const primaryCategories = options.categories
    .filter((category) => !category.parentId)
    .map((category) => {
      const children = options.categories
        .filter((candidate) => candidate.parentId === category.id)
        .map((candidate) => candidate.label.split(" / ").at(-1))
        .filter(Boolean);
      return {
        ...category,
        description:
          children.length > 0
            ? children.slice(0, 4).join(", ")
            : "Browse approved parts in this category.",
      };
    });

  return (
    <section className="min-h-[70vh] bg-white py-8 sm:py-12">
      <div className="container-page">
        <header className="max-w-3xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Browse by vehicle system
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-5xl">
            All parts categories
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
            Choose the system you are repairing, then narrow the live approved
            inventory by vehicle, condition, brand, seller, price, and location.
          </p>
        </header>

        {primaryCategories.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {primaryCategories.map((category) => (
              <CategoryCard category={category} key={category.id} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center">
            <h2 className="font-body text-xl font-bold text-stone-950">
              Categories are being prepared
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              No active marketplace categories are available right now.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
