import Image from "next/image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CatalogHit } from "@/lib/marketplace/types";
import { currency } from "@/lib/utils";

export function ProductCard({ product }: { product: CatalogHit }) {
  return (
    <article className="grid overflow-hidden rounded-lg border bg-white shadow-soft">
      <Link href={`/products/${product.slug}`} className="relative aspect-[4/3] bg-muted">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            No image
          </div>
        )}
        {product.isSponsored ? (
          <div className="absolute left-2 top-2">
            <Badge variant="accent">Sponsored</Badge>
          </div>
        ) : null}
      </Link>
      <div className="grid gap-3 p-4">
        <div className="grid gap-1">
          <Link
            href={`/products/${product.slug}`}
            className="font-semibold leading-snug hover:text-primary"
          >
            {product.title}
          </Link>
          <p className="text-xs text-muted-foreground">SKU {product.sku}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold">{currency(product.price, product.currency)}</p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
            {product.ratingAverage.toFixed(1)}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden="true" />
          <span>
            {product.locationCity}, {product.locationState}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{product.availability.replace(/_/g, " ")}</Badge>
          <Badge variant="muted">{product.categoryName}</Badge>
        </div>
        <Button asChild variant="outline">
          <Link href={`/products/${product.slug}`}>View part</Link>
        </Button>
      </div>
    </article>
  );
}
