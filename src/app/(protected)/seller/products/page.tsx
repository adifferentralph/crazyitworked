import Image from "next/image";
import Link from "next/link";
import { ImageOff, Package, Plus } from "lucide-react";

import { ProductStatusBadge } from "@/components/seller/product-status-badge";
import { SellerShell } from "@/components/seller/seller-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { formatNgn } from "@/lib/marketplace/products";
import { getSellerProducts } from "@/lib/marketplace/seller-data";

export default async function SellerProductsPage() {
  const principal = await requireRole(["SELLER"], "/seller/products");
  const products = await getSellerProducts(principal.id);

  return (
    <SellerShell description="Manage draft, review, approved, and inventory states from one real-time catalogue." title="My products">
      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-[#fffdf9] px-6 py-16 text-center">
          <Package className="mx-auto size-10 text-stone-400" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-semibold text-stone-950">Your catalogue is empty</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-stone-600">Add the first real product as a draft. It stays private until you submit it and an administrator approves it.</p>
          <Button asChild className="mt-6">
            <Link href="/seller/products/new"><Plus className="size-4" aria-hidden="true" />Add product</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => (
            <article className="grid gap-4 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-[112px_1fr_auto] sm:items-center" key={product.id}>
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md bg-stone-100">
                {product.primaryImageUrl ? (
                  <Image alt="" className="object-cover" fill sizes="112px" src={product.primaryImageUrl} unoptimized />
                ) : <ImageOff className="size-7 text-stone-400" aria-hidden="true" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-semibold text-stone-950">{product.name}</h2>
                  <ProductStatusBadge status={product.status} />
                </div>
                <p className="mt-2 font-mono text-xs text-stone-500">SKU {product.sku}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-600">
                  <span className="font-semibold text-stone-950">{formatNgn(product.price_minor)}</span>
                  <span>{product.quantity} in stock</span>
                  <span>{product.city}, {product.state}</span>
                </div>
              </div>
              <Button asChild variant="outline"><Link href={`/seller/products/${product.id}`}>View product</Link></Button>
            </article>
          ))}
        </div>
      )}
    </SellerShell>
  );
}
