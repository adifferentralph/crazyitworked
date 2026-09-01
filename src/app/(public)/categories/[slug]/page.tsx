import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketplaceCatalog } from "@/components/marketplace/marketplace-catalog";
import { getMarketplaceOptions } from "@/lib/marketplace/public-catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const options = await getMarketplaceOptions();
  const category = options.categories.find(
    (candidate) => !candidate.parentId && candidate.slug === slug,
  );

  if (!category) return { title: "Category not found" };

  return {
    description: `Browse approved ${category.label.toLowerCase()} listings and filter by vehicle, condition, brand, seller, price, and location.`,
    title: `${category.label} parts`,
  };
}

export default async function CategoryResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, options] = await Promise.all([
    params,
    getMarketplaceOptions(),
  ]);
  const category = options.categories.find(
    (candidate) => !candidate.parentId && candidate.slug === slug,
  );

  if (!category) notFound();

  return (
    <MarketplaceCatalog
      actionPath={`/categories/${category.slug}`}
      forcedCategoryId={category.id}
      searchParams={searchParams}
    />
  );
}
