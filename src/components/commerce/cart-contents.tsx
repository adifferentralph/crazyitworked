"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { AlertTriangle, MapPin, Minus, Plus, Truck, X } from "lucide-react";

import {
  removeCartItemAction,
  updateCartItemAction,
  type CartMutationState,
} from "@/app/(protected)/commerce-actions";
import { Button } from "@/components/ui/button";
import { formatNgn } from "@/lib/marketplace/products";

export type CartDisplayItem = {
  available: number;
  id: string;
  imageUrl: string | null;
  product: {
    city: string;
    delivery_available: boolean;
    delivery_fee_minor: number;
    id: string;
    name: string;
    pickup_available: boolean;
    price_minor: number;
    slug: string;
    state: string;
  };
  quantity: number;
  sellerName: string;
};

function CartQuantityControl({
  available,
  cartItemId,
  onChange,
  productName,
  quantity,
}: {
  available: number;
  cartItemId: string;
  onChange: (quantity: number) => void;
  productName: string;
  quantity: number;
}) {
  const initialState: CartMutationState = { message: null, quantity, status: "idle" };
  const [state, action, pending] = useActionState(updateCartItemAction, initialState);
  const savedQuantity = useRef(quantity);

  useEffect(() => {
    if (state.status === "idle") return;
    savedQuantity.current = state.quantity;
    if (state.quantity !== quantity) onChange(state.quantity);
  }, [onChange, quantity, state.quantity, state.status]);

  useEffect(() => {
    if (quantity === savedQuantity.current || quantity < 1) return;

    const timer = window.setTimeout(() => {
      const formData = new FormData();
      formData.set("cartItemId", cartItemId);
      formData.set("quantity", String(quantity));
      startTransition(() => action(formData));
    }, 450);

    return () => window.clearTimeout(timer);
  }, [action, cartItemId, quantity]);

  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold text-stone-600">Quantity</span>
      <div className="flex h-10 overflow-hidden rounded-md border border-stone-300 bg-white">
        <button
          aria-label={`Decrease quantity of ${productName}`}
          className="grid w-10 place-items-center text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={pending || quantity <= 1}
          onClick={() => onChange(quantity - 1)}
          type="button"
        >
          <Minus aria-hidden="true" className="size-4" />
        </button>
        <input
          aria-label={`Quantity of ${productName}`}
          className="w-14 border-x border-stone-200 text-center text-sm font-bold outline-none"
          disabled={pending}
          inputMode="numeric"
          max={Math.max(available, 1)}
          min="1"
          onChange={(event) => {
            const next = Number.parseInt(event.target.value, 10);
            if (Number.isFinite(next)) onChange(Math.min(available, Math.max(1, next)));
          }}
          type="number"
          value={quantity}
        />
        <button
          aria-label={`Increase quantity of ${productName}`}
          className="grid w-10 place-items-center text-stone-700 transition-colors hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={pending || quantity >= available}
          onClick={() => onChange(quantity + 1)}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
        </button>
      </div>
      <span aria-live="polite" className="min-h-4 text-[11px] font-semibold text-stone-500">
        {pending ? "Saving..." : state.status === "error" ? state.message : ""}
      </span>
    </div>
  );
}

export function CartContents({ initialItems }: { initialItems: CartDisplayItem[] }) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(initialItems.map((item) => [item.id, item.quantity])),
  );
  const subtotal = initialItems.reduce(
    (sum, item) => sum + item.product.price_minor * (quantities[item.id] ?? item.quantity),
    0,
  );
  const delivery = initialItems.reduce(
    (sum, item) => sum + (item.product.delivery_available ? item.product.delivery_fee_minor : 0),
    0,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid content-start gap-4">
        {initialItems.map((item) => {
          const quantity = quantities[item.id] ?? item.quantity;
          return (
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
                  <span className="grid size-full place-items-center text-xs text-stone-400">No image</span>
                )}
              </Link>
              <div className="min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-body text-lg font-bold text-stone-950">
                      <Link href={`/parts/${item.product.slug}`}>{item.product.name}</Link>
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">{item.sellerName}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                      <MapPin aria-hidden="true" className="size-3.5 text-primary" />
                      {item.product.city}, {item.product.state}
                    </p>
                    {item.product.delivery_available ? (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                        <Truck aria-hidden="true" className="size-3.5 text-primary" />
                        Delivery {formatNgn(item.product.delivery_fee_minor)}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-lg font-semibold text-stone-950">
                    {formatNgn(item.product.price_minor * quantity)}
                  </p>
                </div>
                {quantity > item.available ? (
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary">
                    <AlertTriangle aria-hidden="true" className="size-4" />
                    Only {item.available} currently available. Reduce or remove this item.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-start gap-3">
                  <CartQuantityControl
                    available={item.available}
                    cartItemId={item.id}
                    onChange={(nextQuantity) => {
                      setQuantities((current) => ({ ...current, [item.id]: nextQuantity }));
                    }}
                    productName={item.product.name}
                    quantity={quantity}
                  />
                  <form action={removeCartItemAction} className="pt-5">
                    <input name="cartItemId" type="hidden" value={item.id} />
                    <Button
                      aria-label={`Remove ${item.product.name} from cart`}
                      size="icon"
                      title={`Remove ${item.product.name}`}
                      type="submit"
                      variant="ghost"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </Button>
                  </form>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-body text-lg font-bold text-stone-950">Cart summary</h2>
        <dl className="mt-4 grid gap-3 border-y border-stone-200 py-4">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-stone-600">Product Price</dt>
            <dd className="text-lg font-semibold text-stone-950">{formatNgn(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-stone-600">Delivery if selected</dt>
            <dd className="font-semibold text-stone-950">{formatNgn(delivery)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-stone-500">
          Choose pickup or delivery at checkout. Stock, prices, and delivery availability are checked again before payment.
        </p>
        <Button asChild className="mt-5 w-full">
          <Link href="/checkout">Proceed to checkout</Link>
        </Button>
        <Button asChild className="mt-2 w-full" variant="outline">
          <Link href="/marketplace">Continue shopping</Link>
        </Button>
      </aside>
    </div>
  );
}
