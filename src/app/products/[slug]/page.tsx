import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MessageSquare, PackageCheck, ShoppingCart, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductBySlug } from "@/lib/search/algolia";
import { currency } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product" };
  }

  return {
    title: product.title,
    description: `${product.title} from ${product.vendorName}. SKU ${product.sku}.`,
    openGraph: {
      title: product.title,
      description: `${currency(product.price, product.currency)} from ${product.vendorName}`,
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    sku: product.sku,
    brand: product.vendorName,
    image: product.imageUrl ? [product.imageUrl] : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: product.currency,
      price: product.price,
      availability:
        product.availability === "out_of_stock"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
    aggregateRating:
      product.ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.ratingAverage,
            reviewCount: product.ratingCount,
          }
        : undefined,
  };

  return (
    <section className="container-page grid gap-8 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.75fr)]">
        <div className="grid gap-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-white">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">No image</div>
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Compatibility</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <p>
                Fits {product.fitmentYears.length} model years across{" "}
                {product.fitmentMakes.join(", ")} {product.fitmentModels.join(", ")}.
              </p>
              <div className="flex flex-wrap gap-2">
                {product.fitmentVariants.slice(0, 8).map((variant) => (
                  <Badge key={variant} variant="outline">
                    {variant}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="grid gap-4">
          <div className="rounded-lg border bg-white p-5 shadow-soft">
            <div className="flex flex-wrap gap-2">
              {product.isSponsored ? <Badge variant="accent">Sponsored</Badge> : null}
              <Badge variant="outline">{product.availability.replace(/_/g, " ")}</Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight">{product.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">SKU {product.sku}</p>
            <p className="mt-5 text-3xl font-semibold">
              {currency(product.price, product.currency)}
            </p>
            <div className="mt-5 grid gap-2">
              <Button>
                <ShoppingCart className="size-4" aria-hidden="true" />
                Add to cart
              </Button>
              <Button variant="secondary">
                <PackageCheck className="size-4" aria-hidden="true" />
                Buy now
              </Button>
              <Button variant="outline">
                <MessageSquare className="size-4" aria-hidden="true" />
                Contact vendor
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Vendor</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">{product.vendorName}</p>
              <p>
                {product.locationCity}, {product.locationState}
              </p>
              <p>
                {product.ratingAverage.toFixed(1)} average rating from {product.ratingCount} reviews
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>References</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <ReferenceList title="OEM" values={product.oemNumbers} />
              <ReferenceList title="Aftermarket" values={product.aftermarketReferences} />
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="size-4" aria-hidden="true" />
                Pickup, delivery, or interstate shipping by vendor policy
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}

function ReferenceList({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.length ? (
          values.map((value) => (
            <Badge key={value} variant="outline">
              {value}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground">None listed</span>
        )}
      </div>
    </div>
  );
}
