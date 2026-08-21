import Image from "next/image";
import Link from "next/link";
import { CircleCheck, ImageOff, MapPin, PackageCheck, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNgn } from "@/lib/marketplace/products";
import type { MarketplaceVehicleOption, searchMarketplaceProducts } from "@/lib/marketplace/public-catalog";

type Product = Awaited<ReturnType<typeof searchMarketplaceProducts>>["products"][number];

export function ProductCard({ product, vehicle }: { product: Product; vehicle?: MarketplaceVehicleOption }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="relative aspect-[4/3] bg-stone-100">
        {product.primaryImageUrl ? <Image alt={`${product.name} sold by ${product.seller?.store_name ?? "a marketplace supplier"}`} className="object-cover" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" src={product.primaryImageUrl} unoptimized /> : <div className="grid size-full place-items-center"><ImageOff className="size-9 text-stone-400" aria-hidden="true" /></div>}
        <Badge className="absolute left-3 top-3 capitalize" variant="outline">{product.condition.replaceAll("_", " ").toLowerCase()}</Badge>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{product.categoryName}</p>
        <h2 className="mt-2 text-xl font-semibold leading-snug text-stone-950"><Link className="focus-visible:underline" href={`/parts/${product.slug}`}>{product.name}</Link></h2>
        <p className="mt-3 text-2xl font-semibold text-stone-950">{formatNgn(product.price_minor)}</p>
        <div className="mt-4 grid gap-2 text-sm text-stone-600">
          <p className="flex items-center gap-2"><PackageCheck className="size-4 text-primary" aria-hidden="true" />{product.seller?.store_name ?? "Marketplace supplier"}</p>
          <p className="flex items-center gap-2"><MapPin className="size-4 text-primary" aria-hidden="true" />{product.city}, {product.state}</p>
          <p className="flex items-center gap-2"><Star className="size-4 text-primary" aria-hidden="true" />No reviews yet</p>
          {vehicle ? <p className="flex items-start gap-2 font-semibold text-emerald-700"><CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Seller lists {vehicle.label}</p> : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className={product.quantity > 0 ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-stone-500"}>{product.quantity > 0 ? `${product.quantity} in stock` : "Out of stock"}</span>
          <Button asChild size="sm" variant="outline"><Link href={`/parts/${product.slug}`}>View part</Link></Button>
        </div>
      </div>
    </article>
  );
}
