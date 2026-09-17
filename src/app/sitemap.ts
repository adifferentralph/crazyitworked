import type { MetadataRoute } from "next";
import { and, eq, isNull } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { marketplaceSellers, productCategories, products } from "@/db/schema";
import { siteConfig } from "@/config/site";
import { getCanonicalUrl } from "@/lib/seo/metadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const database = getDatabase();
  const [categories, productRows, stores] = await Promise.all([
    database
      .select({ slug: productCategories.slug, updatedAt: productCategories.updatedAt })
      .from(productCategories)
      .where(and(eq(productCategories.isActive, true), isNull(productCategories.parentId))),
    database
      .select({ slug: products.slug, updatedAt: products.updatedAt })
      .from(products)
      .where(eq(products.status, "APPROVED"))
      .limit(45_000),
    database
      .select({ slug: marketplaceSellers.slug })
      .from(marketplaceSellers)
      .where(eq(marketplaceSellers.sellerStatus, "ACTIVE"))
      .limit(5_000),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { changeFrequency: "daily", priority: 1, url: siteConfig.url },
    { changeFrequency: "daily", priority: 0.9, url: getCanonicalUrl("/marketplace") },
    { changeFrequency: "weekly", priority: 0.8, url: getCanonicalUrl("/categories") },
    { changeFrequency: "yearly", priority: 0.2, url: getCanonicalUrl("/cookie-policy") },
    { changeFrequency: "yearly", priority: 0.2, url: getCanonicalUrl("/privacy-policy") },
  ];

  return [
    ...staticRoutes,
    ...categories.map((category) => ({
      changeFrequency: "weekly" as const,
      lastModified: category.updatedAt,
      priority: 0.8,
      url: getCanonicalUrl(`/categories/${category.slug}`),
    })),
    ...productRows.map((product) => ({
      changeFrequency: "weekly" as const,
      lastModified: product.updatedAt,
      priority: 0.7,
      url: getCanonicalUrl(`/parts/${product.slug}`),
    })),
    ...stores.map((store) => ({
      changeFrequency: "weekly" as const,
      priority: 0.7,
      url: getCanonicalUrl(`/store/${store.slug}`),
    })),
  ];
}
