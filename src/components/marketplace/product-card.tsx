import Image from "next/image";
import Link from "next/link";
import { CircleCheck, ImageOff, MapPin, PackageCheck, ShoppingCart } from "lucide-react";

import { addToCartAction } from "@/app/(protected)/commerce-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNgn } from "@/lib/marketplace/products";
import type {
  MarketplaceVehicleOption,
  searchMarketplaceProducts,
} from "@/lib/marketplace/public-catalog";

type Product = Awaited<ReturnType<typeof searchMarketplaceProducts>>["products"][number];

export function ProductCard({
  canPurchase = false,
  product,
  vehicle,
}: {
  canPurchase?: boolean;
  product: Product;
  vehicle?: MarketplaceVehicleOption;
}) {
  return (
    <article data-marketplace-product className="flex h-full flex-col overflow-hidden rounded-lg border border-stone-200 bg-white">
      <Link className="relative aspect-[4/3] bg-stone-100 focus-visible:ring-2 focus-visible:ring-primary" href={`/parts/${product.slug}`}>
        {product.primaryImageUrl ? (
          <Image alt={`${product.name} sold by ${product.seller?.store_name ?? "a marketplace supplier"}`} className="object-cover" fill sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw" src={product.primaryImageUrl} unoptimized />
        ) : (
          <span className="grid size-full place-items-center"><ImageOff className="size-8 text-stone-400" aria-hidden="true" /></span>
        )}
        <Badge className="absolute left-3 top-3 capitalize" variant="outline">{product.condition.replaceAll("_", " ").toLowerCase()}</Badge>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">{product.categoryName}</p>
        <h2 className="mt-1 font-body text-base font-bold leading-snug text-stone-950"><Link className="focus-visible:underline" href={`/parts/${product.slug}`}>{product.name}</Link></h2>
        <p className="mt-2 text-xl font-semibold text-stone-950">{formatNgn(product.price_minor)}</p>
        <div className="mt-3 grid gap-1.5 text-xs text-stone-600">
          <p className="flex items-center gap-2"><PackageCheck className="size-3.5 text-primary" aria-hidden="true" />{product.seller?.store_name ?? "Marketplace supplier"}</p>
          <p className="flex items-center gap-2"><MapPin className="size-3.5 text-primary" aria-hidden="true" />{product.city}, {product.state}</p>
          {vehicle ? <p className="flex items-start gap-2 font-semibold text-emerald-700"><CircleCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Seller lists {vehicle.label}</p> : null}
        </div>
        <p className={product.quantity > 0 ? "mt-3 text-xs font-semibold text-emerald-700" : "mt-3 text-xs font-semibold text-stone-500"}>{product.quantity > 0 ? `${product.quantity} in stock` : "Out of stock"}</p>
        <div className={canPurchase ? "mt-auto grid gap-2 pt-4 sm:grid-cols-2" : "mt-auto grid pt-4"}>
          <Button asChild size="sm" variant="outline"><Link href={`/parts/${product.slug}`}>View part</Link></Button>
          {canPurchase ? (
            <form action={addToCartAction}>
              <input name="productId" type="hidden" value={product.id} />
              <input name="quantity" type="hidden" value="1" />
              <Button className="w-full" disabled={product.quantity < 1} size="sm" type="submit"><ShoppingCart className="size-4" aria-hidden="true" />Add</Button>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}