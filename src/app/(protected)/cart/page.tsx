import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, MapPin, ShoppingCart, Trash2 } from "lucide-react";

import {
  removeCartItemAction,
  updateCartItemAction,
} from "@/app/(protected)/commerce-actions";
import { AccountSectionPage } from "@/components/account/account-section-page";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { getBuyerCart } from "@/lib/marketplace/buyer-data";
import { formatNgn } from "@/lib/marketplace/products";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const principal = await requireRole(["BUYER"], "/cart");
  const [cart, query] = await Promise.all([
    getBuyerCart(principal.id),
    searchParams,
  ]);

  if (!cart.length) {
    return (
      <AccountSectionPage
        action="Browse parts"
        description="Review selected parts and live stock before placing an order."
        emptyDescription="Add an approved marketplace part when you are ready to purchase."
        emptyTitle="Your cart is empty"
        icon={ShoppingCart}
        title="Cart"
      />
    );
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price_minor * item.quantity,
    0,
  );

  return (
    <AccountSectionPage
      description="Review selected parts and live stock before placing an order."
      icon={ShoppingCart}
      title="Cart"
    >
      {query.message === "added" ? (
        <p
          className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"
          role="status"
        >
          Part added to your cart.
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-4">
          {cart.map((item) => (
            <article
              className="grid gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-[7rem_minmax(0,1fr)]"
              key={item.id}
            >
              <Link
                className="relative aspect-square overflow-hidden rounded-md bg-stone-100"
                href={`/parts/${item.product.slug}`}
              >
                {item.imageUrl ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="112px"
                    src={item.imageUrl}
                    unoptimized
                  />
                ) : (
                  <span className="grid size-full place-items-center text-xs text-stone-400">
                    No image
                  </span>
                )}
              </Link>
              <div className="min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-body text-lg font-bold text-stone-950">
                      <Link href={`/parts/${item.product.slug}`}>
                        {item.product.name}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">{item.sellerName}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                      <MapPin aria-hidden="true" className="size-3.5 text-primary" />
                      {item.product.city}, {item.product.state}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-stone-950">
                    {formatNgn(item.product.price_minor * item.quantity)}
                  </p>
                </div>
                {item.quantity > item.available ? (
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary">
                    <AlertTriangle aria-hidden="true" className="size-4" />
                    Only {item.available} currently available. Reduce or remove this
                    item.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-end gap-2">
                  <form action={updateCartItemAction} className="flex items-end gap-2">
                    <input name="cartItemId" type="hidden" value={item.id} />
                    <div className="grid gap-1">
                      <label
                        className="text-xs font-semibold text-stone-600"
                        htmlFor={`quantity-${item.id}`}
                      >
                        Quantity
                      </label>
                      <input
                        className="h-9 w-20 rounded-md border border-stone-300 px-2"
                        defaultValue={item.quantity}
                        id={`quantity-${item.id}`}
                        max={Math.max(item.available, 1)}
                        min="1"
                        name="quantity"
                        type="number"
                      />
                    </div>
                    <Button size="sm" type="submit" variant="outline">
                      Update
                    </Button>
                  </form>
                  <form action={removeCartItemAction}>
                    <input name="cartItemId" type="hidden" value={item.id} />
                    <Button size="sm" type="submit" variant="ghost">
                      <Trash2 aria-hidden="true" className="size-4" />
                      Remove
                    </Button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="font-body text-lg font-bold text-stone-950">Cart summary</h2>
          <dl className="mt-4 border-y border-stone-200 py-4">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-stone-600">Subtotal</dt>
              <dd className="text-lg font-semibold text-stone-950">
                {formatNgn(subtotal)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-stone-500">
            Stock and current prices are checked again before secure payment opens.
          </p>
          <Button asChild className="mt-5 w-full">
            <Link href="/checkout">Proceed to checkout</Link>
          </Button>
          <Button asChild className="mt-2 w-full" variant="outline">
            <Link href="/marketplace">Continue shopping</Link>
          </Button>
        </aside>
      </div>
    </AccountSectionPage>
  );
}
