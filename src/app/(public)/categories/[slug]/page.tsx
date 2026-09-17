import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MarketplaceCatalog } from "@/components/marketplace/marketplace-catalog";
import { getMarketplaceOptions } from "@/lib/marketplace/public-catalog";
import { JsonLd } from "@/lib/seo/json-ld";
import { createPublicMetadata, getCanonicalUrl } from "@/lib/seo/metadata";

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

  return createPublicMetadata({
    description: `Browse approved ${category.label.toLowerCase()} listings and filter by vehicle, condition, brand, seller, price, and location.`,
    path: `/categories/${category.slug}`,
    title: `${category.label} Parts & Components`,
  });
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
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", item: getCanonicalUrl("/"), name: "Marketplace", position: 1 },
            { "@type": "ListItem", item: getCanonicalUrl("/categories"), name: "Categories", position: 2 },
            { "@type": "ListItem", item: getCanonicalUrl(`/categories/${category.slug}`), name: category.label, position: 3 },
          ],
        }}
      />
      <MarketplaceCatalog
        actionPath={`/categories/${category.slug}`}
        forcedCategoryId={category.id}
        searchParams={searchParams}
      />
    </>
  );
}
