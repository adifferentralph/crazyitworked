import type { Metadata } from "next";
import { MapPin, Store } from "lucide-react";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/marketplace/product-card";
import { getCurrentPrincipal } from "@/lib/auth/principal";
import {
  getMarketplaceStore,
  parseMarketplaceSearch,
  searchMarketplaceProducts,
} from "@/lib/marketplace/public-catalog";
import { JsonLd } from "@/lib/seo/json-ld";
import { createPublicMetadata, getCanonicalUrl } from "@/lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await getMarketplaceStore(slug);
  if (!store) return { robots: { follow: false, index: false }, title: "Store not found" };

  return createPublicMetadata({
    description: `Browse automotive parts from ${store.store_name} on Twenty-Two Parts.`,
    path: `/store/${store.slug}`,
    title: `${store.store_name} Auto Parts`,
  });
}

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getMarketplaceStore(slug);
  if (!store) notFound();

  const principal = await getCurrentPrincipal();
  const canPurchase = principal?.role === "BUYER" && principal.status === "ACTIVE";
  const search = parseMarketplaceSearch({ seller: store.seller_id, sort: "newest" });
  const result = await searchMarketplaceProducts(search);
  const location = [store.city, store.state, store.country].filter(Boolean).join(", ");
  const storeUrl = getCanonicalUrl(`/store/${store.slug}`);
  const postalAddress = store.city || store.state
    ? {
        "@type": "PostalAddress",
        addressCountry: store.country,
        addressLocality: store.city ?? undefined,
        addressRegion: store.state ?? undefined,
      }
    : undefined;

  return (
    <section className="min-h-[70vh] bg-white py-8 sm:py-12">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Store",
            address: postalAddress,
            name: store.store_name,
            url: storeUrl,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", item: getCanonicalUrl("/"), name: "Marketplace", position: 1 },
              { "@type": "ListItem", item: storeUrl, name: store.store_name, position: 2 },
            ],
          },
        ]}
      />
      <div className="container-page">
        <header className="rounded-xl border border-stone-200 bg-[#fffdf9] p-5 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-black text-white">
              <Store aria-hidden="true" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Supplier store</p>
              <h1 className="mt-2 text-3xl font-bold text-stone-950 sm:text-4xl">{store.store_name}</h1>
              {location ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-stone-600">
                  <MapPin aria-hidden="true" className="size-4 text-primary" />
                  {location}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <div className="mt-8 flex items-end justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-stone-950">Products from {store.store_name}</h2>
            <p className="mt-1 text-sm text-stone-600">{result.count} approved {result.count === 1 ? "product" : "products"}</p>
          </div>
        </div>

        {result.products.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {result.products.map((product) => (
              <ProductCard canPurchase={canPurchase} key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-8 text-center text-sm text-stone-600">
            This store has no approved products available right now.
          </p>
        )}
      </div>
    </section>
  );
}
