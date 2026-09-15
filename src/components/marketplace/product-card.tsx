import Image from "next/image";
import Link from "next/link";
import { ImageOff, ShoppingCart } from "lucide-react";

import { addToCartAction } from "@/app/(protected)/commerce-actions";
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
  const fitment = vehicle ?? product.primaryVehicle;

  return (
    <article data-marketplace-product className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-stone-200 bg-white">
      <Link className="relative aspect-square bg-stone-100 focus-visible:ring-2 focus-visible:ring-primary" href={`/parts/${product.slug}`}>
        {product.primaryImageUrl ? (
          <Image alt={`${product.name} sold by ${product.seller?.store_name ?? "a marketplace supplier"}`} className="object-cover" fill sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw" src={product.primaryImageUrl} unoptimized />
        ) : (
          <span className="grid size-full place-items-center"><ImageOff className="size-7 text-stone-400" aria-hidden="true" /></span>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold capitalize text-stone-700 shadow-sm">
          {product.condition.replaceAll("_", " ").toLowerCase()}
        </span>
        {product.quantity > 0 && product.quantity <= 3 ? (
          <span className="absolute bottom-2 left-2 rounded bg-primary px-2 py-1 text-[10px] font-bold text-white">Only {product.quantity} left</span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        {product.sponsored ? <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">Sponsored</p> : null}
        <h2 className="mt-1 line-clamp-2 font-body text-sm font-bold leading-snug text-stone-950 sm:text-base">
          <Link className="focus-visible:underline" href={`/parts/${product.slug}`}>{product.name}</Link>
        </h2>
        {fitment ? <p className="mt-1 truncate text-xs font-semibold text-stone-500">{fitment.make}</p> : null}
        <p className="mt-2 font-body text-lg font-extrabold text-stone-950 sm:text-xl">{formatNgn(product.price_minor)}</p>
        <p className={product.quantity > 0 ? "mt-1 text-[11px] font-semibold text-emerald-700" : "mt-1 text-[11px] font-semibold text-stone-500"}>
          {product.quantity > 0 ? "In stock" : "Out of stock"}
        </p>
        {canPurchase ? (
          <form action={addToCartAction} className="mt-auto pt-3">
            <input name="productId" type="hidden" value={product.id} />
            <input name="quantity" type="hidden" value="1" />
            <Button className="w-full px-2" disabled={product.quantity < 1} size="sm" type="submit">
              <ShoppingCart className="size-4" aria-hidden="true" /> Add
            </Button>
          </form>
        ) : null}
      </div>
    </article>
  );
}
