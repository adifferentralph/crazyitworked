"use client";

import { useState } from "react";
import { MapPin, PackageCheck, Truck } from "lucide-react";

import { startCheckoutAction } from "@/app/(protected)/checkout/actions";
import { CheckoutSubmitButton } from "@/components/commerce/checkout-submit-button";
import { Input } from "@/components/ui/input";
import { calculateCheckoutTotals } from "@/lib/commerce/pricing";
import { formatNgn } from "@/lib/marketplace/products";

type CheckoutItem = {
  available: number;
  id: string;
  product: {
    city: string;
    delivery_available: boolean;
    delivery_fee_minor: number;
    name: string;
    pickup_available: boolean;
    price_minor: number;
    state: string;
  };
  quantity: number;
  sellerName: string;
};

const labelClass = "mb-2 block text-sm font-semibold text-stone-800";

export function CheckoutExperience({
  cart,
  paymentConfigured,
}: {
  cart: CheckoutItem[];
  paymentConfigured: boolean;
}) {
  const pickupAvailable = cart.every((item) => item.product.pickup_available);
  const deliveryAvailable = cart.every((item) => item.product.delivery_available);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"PICKUP" | "DELIVERY">(
    pickupAvailable ? "PICKUP" : "DELIVERY",
  );
  const totals = calculateCheckoutTotals(
    cart.map((item) => ({
      deliveryFeeMinor: item.product.delivery_fee_minor,
      priceMinor: item.product.price_minor,
      quantity: item.quantity,
    })),
    fulfillmentMethod,
  );
  const stockAvailable = cart.every((item) => item.quantity <= item.available);
  const methodAvailable = fulfillmentMethod === "DELIVERY" ? deliveryAvailable : pickupAvailable;
  const canCheckout = stockAvailable && methodAvailable && paymentConfigured;

  return (
    <form action={startCheckoutAction}>
      <input name="fulfillmentMethod" type="hidden" value={fulfillmentMethod} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-4">
          <section className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-stone-950">How do you want your order?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                aria-pressed={fulfillmentMethod === "PICKUP"}
                className={`rounded-lg border p-4 text-left transition-colors ${fulfillmentMethod === "PICKUP" ? "border-primary bg-red-50" : "border-stone-200 bg-white"}`}
                disabled={!pickupAvailable}
                onClick={() => setFulfillmentMethod("PICKUP")}
                type="button"
              >
                <span className="flex items-center gap-2 font-bold text-stone-950"><PackageCheck aria-hidden="true" className="size-5 text-primary" />Pickup</span>
                <span className="mt-2 block text-sm text-stone-600">{pickupAvailable ? `${formatNgn(0)} from each supplier` : "Not available for every item"}</span>
              </button>
              <button
                aria-pressed={fulfillmentMethod === "DELIVERY"}
                className={`rounded-lg border p-4 text-left transition-colors ${fulfillmentMethod === "DELIVERY" ? "border-primary bg-red-50" : "border-stone-200 bg-white"}`}
                disabled={!deliveryAvailable}
                onClick={() => setFulfillmentMethod("DELIVERY")}
                type="button"
              >
                <span className="flex items-center gap-2 font-bold text-stone-950"><Truck aria-hidden="true" className="size-5 text-primary" />Delivery</span>
                <span className="mt-2 block text-sm text-stone-600">{deliveryAvailable ? formatNgn(cart.reduce((sum, item) => sum + item.product.delivery_fee_minor, 0)) : "Not available for every item"}</span>
              </button>
            </div>
          </section>

          {fulfillmentMethod === "DELIVERY" ? (
            <section className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <h2 className="text-xl font-semibold text-stone-950">Delivery address</h2>
                <p className="mt-1 text-sm text-stone-600">Enter where the suppliers should send your parts.</p>
              </div>
              <div>
                <label className={labelClass} htmlFor="deliveryRecipientName">Recipient name</label>
                <Input id="deliveryRecipientName" name="deliveryRecipientName" required />
              </div>
              <div>
                <label className={labelClass} htmlFor="deliveryPhone">Phone number</label>
                <Input id="deliveryPhone" inputMode="tel" name="deliveryPhone" required />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="deliveryAddressLine1">Street address</label>
                <Input id="deliveryAddressLine1" name="deliveryAddressLine1" required />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="deliveryAddressLine2">More address details <span className="font-normal text-stone-500">(optional)</span></label>
                <Input id="deliveryAddressLine2" name="deliveryAddressLine2" placeholder="Apartment, landmark, or building" />
              </div>
              <div>
                <label className={labelClass} htmlFor="deliveryCity">City</label>
                <Input id="deliveryCity" name="deliveryCity" required />
              </div>
              <div>
                <label className={labelClass} htmlFor="deliveryState">State</label>
                <Input id="deliveryState" name="deliveryState" required />
              </div>
            </section>
          ) : null}

          {cart.map((item) => {
            const purchasable = item.quantity <= item.available && (
              fulfillmentMethod === "DELIVERY"
                ? item.product.delivery_available
                : item.product.pickup_available
            );
            return (
              <article className="rounded-xl border border-stone-200 bg-white p-5" key={item.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-body text-base font-bold text-stone-950">{item.product.name}</h2>
                    <p className="mt-1 text-sm text-stone-600">{item.sellerName} · Quantity {item.quantity}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
                      <MapPin aria-hidden="true" className="size-3.5 text-primary" />
                      {fulfillmentMethod === "DELIVERY" ? "Ships from" : "Pickup in"} {item.product.city}, {item.product.state}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-bold text-stone-950">{formatNgn(item.product.price_minor * item.quantity)}</p>
                </div>
                {!purchasable ? (
                  <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-900">
                    {item.quantity > item.available
                      ? `Only ${item.available} currently available.`
                      : `${fulfillmentMethod === "DELIVERY" ? "Delivery" : "Pickup"} is not available for this part.`}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>

        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-bold text-stone-950">Order summary</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-stone-600">Product Price</dt><dd className="font-mono font-semibold text-stone-950">{formatNgn(totals.productSubtotalMinor)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-stone-600">Delivery</dt><dd className="font-mono font-semibold text-stone-950">{formatNgn(totals.deliveryTotalMinor)}</dd></div>
            <div className="mt-1 flex justify-between gap-4 border-t border-stone-200 pt-4"><dt className="font-bold text-stone-950">Total</dt><dd className="font-mono text-lg font-bold text-stone-950">{formatNgn(totals.totalMinor)}</dd></div>
          </dl>
          <div className="mt-6"><CheckoutSubmitButton disabled={!canCheckout} /></div>
        </aside>
      </div>
    </form>
  );
}
