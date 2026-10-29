"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, MapPin, PackageCheck, Truck } from "lucide-react";

import { startCheckoutAction } from "@/app/(protected)/checkout/actions";
import { CheckoutSubmitButton } from "@/components/commerce/checkout-submit-button";
import { Input } from "@/components/ui/input";
import { calculateCheckoutTotals } from "@/lib/commerce/pricing";
import { ANAMBRA_LGAS } from "@/lib/delivery/anambra";
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
const selectClass = "flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type DeliveryQuote = {
  deliveryTotalMinor: number;
  expiresAt: string;
  productSubtotalMinor: number;
  quoteId: string;
  totalMinor: number;
};

export type CheckoutSavedAddress = {
  id: string;
  label: string;
  landmark: string | null;
  latitude: number | null;
  lga: string | null;
  line1: string;
  longitude: number | null;
  phone: string;
  recipientName: string;
  town: string | null;
};

function isDeliveryQuote(value: unknown): value is DeliveryQuote {
  if (!value || typeof value !== "object") return false;
  const quote = value as Record<string, unknown>;
  return typeof quote.quoteId === "string"
    && typeof quote.deliveryTotalMinor === "number"
    && typeof quote.productSubtotalMinor === "number"
    && typeof quote.totalMinor === "number"
    && typeof quote.expiresAt === "string";
}

export function CheckoutExperience({
  cart,
  paymentConfigured,
  savedAddresses = [],
}: {
  cart: CheckoutItem[];
  paymentConfigured: boolean;
  savedAddresses?: CheckoutSavedAddress[];
}) {
  const pickupAvailable = cart.every((item) => item.product.pickup_available);
  const deliveryAvailable = cart.every((item) => item.product.delivery_available);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"PICKUP" | "DELIVERY">(
    pickupAvailable ? "PICKUP" : "DELIVERY",
  );
  const pickupTotals = calculateCheckoutTotals(
    cart.map((item) => ({
      deliveryFeeMinor: item.product.delivery_fee_minor,
      priceMinor: item.product.price_minor,
      quantity: item.quantity,
    })),
    "PICKUP",
  );
  const [address, setAddress] = useState(() => {
    const selected = savedAddresses[0];
    return {
      landmark: selected?.landmark ?? "",
      latitude: selected?.latitude ?? null,
      lga: selected?.lga ?? "",
      longitude: selected?.longitude ?? null,
      phone: selected?.phone ?? "",
      recipientName: selected?.recipientName ?? "",
      streetAddress: selected?.line1 ?? "",
      town: selected?.town ?? "",
    };
  });
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quotePending, setQuotePending] = useState(false);
  const stockAvailable = cart.every((item) => item.quantity <= item.available);
  const methodAvailable = fulfillmentMethod === "DELIVERY" ? deliveryAvailable : pickupAvailable;
  const canCheckout =
    stockAvailable &&
    methodAvailable &&
    paymentConfigured &&
    (fulfillmentMethod === "PICKUP" || Boolean(quote));
  const totals = fulfillmentMethod === "DELIVERY" && quote
    ? quote
    : pickupTotals;

  useEffect(() => {
    if (fulfillmentMethod !== "DELIVERY") {
      setQuote(null);
      setQuoteError(null);
      setQuotePending(false);
      return;
    }
    const complete =
      address.recipientName.trim().length >= 2 &&
      address.phone.trim().length >= 8 &&
      address.streetAddress.trim().length >= 5 &&
      address.town.trim().length >= 2 &&
      Boolean(address.lga);
    if (!complete) {
      setQuote(null);
      setQuoteError(null);
      setQuotePending(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setQuotePending(true);
      setQuote(null);
      setQuoteError(null);
      try {
        const response = await fetch("/api/delivery/quote", {
          body: JSON.stringify({
            landmark: address.landmark.trim() || null,
            latitude: address.latitude,
            lga: address.lga,
            longitude: address.longitude,
            phone: address.phone,
            recipientName: address.recipientName,
            state: "Anambra",
            streetAddress: address.streetAddress,
            town: address.town,
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object") {
          throw new Error("Delivery fee unavailable.");
        }
        if (!response.ok) {
          const message = (payload as { error?: unknown }).error;
          throw new Error(typeof message === "string" ? message : "Delivery fee unavailable.");
        }
        if (!isDeliveryQuote(payload)) throw new Error("Delivery fee unavailable.");
        setQuote(payload);
      } catch (error) {
        if (!controller.signal.aborted) {
          setQuoteError(error instanceof Error ? error.message : "Delivery fee unavailable.");
        }
      } finally {
        if (!controller.signal.aborted) setQuotePending(false);
      }
    }, 600);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [address, fulfillmentMethod]);

  return (
    <form action={startCheckoutAction}>
      <input name="fulfillmentMethod" type="hidden" value={fulfillmentMethod} />
      <input name="deliveryQuoteId" type="hidden" value={quote?.quoteId ?? ""} />
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
                <span className="mt-2 block text-sm text-stone-600">{deliveryAvailable ? "Calculated from your address" : "Not available for every item"}</span>
              </button>
            </div>
          </section>

          {fulfillmentMethod === "DELIVERY" ? (
            <section className="grid gap-4 rounded-xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <h2 className="text-xl font-semibold text-stone-950">Delivery address</h2>
                <p className="mt-1 text-sm text-stone-600">Enter where the suppliers should send your parts.</p>
              </div>
              {savedAddresses.length ? <div className="sm:col-span-2"><label className={labelClass} htmlFor="savedAddress">Saved address</label><select className={selectClass} defaultValue={savedAddresses[0]?.id} id="savedAddress" onChange={(event) => { const selected = savedAddresses.find((entry) => entry.id === event.target.value); if (selected) setAddress({ landmark: selected.landmark ?? "", latitude: selected.latitude, lga: selected.lga ?? "", longitude: selected.longitude, phone: selected.phone, recipientName: selected.recipientName, streetAddress: selected.line1, town: selected.town ?? "" }); }}><option value="">Enter a different address</option>{savedAddresses.map((entry) => <option key={entry.id} value={entry.id}>{entry.label} — {entry.town}</option>)}</select></div> : null}
              <div>
                <label className={labelClass} htmlFor="deliveryRecipientName">Recipient name</label>
                <Input id="deliveryRecipientName" name="deliveryRecipientName" onChange={(event) => setAddress((current) => ({ ...current, recipientName: event.target.value }))} required value={address.recipientName} />
              </div>
              <div>
                <label className={labelClass} htmlFor="deliveryPhone">Phone number</label>
                <Input id="deliveryPhone" inputMode="tel" name="deliveryPhone" onChange={(event) => setAddress((current) => ({ ...current, phone: event.target.value }))} required value={address.phone} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="deliveryAddressLine1">Street address</label>
                <Input id="deliveryAddressLine1" name="deliveryAddressLine1" onChange={(event) => setAddress((current) => ({ ...current, streetAddress: event.target.value }))} required value={address.streetAddress} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="deliveryAddressLine2">More address details <span className="font-normal text-stone-500">(optional)</span></label>
                <Input id="deliveryAddressLine2" name="deliveryAddressLine2" onChange={(event) => setAddress((current) => ({ ...current, landmark: event.target.value }))} placeholder="Landmark or building" value={address.landmark} />
              </div>
              <div>
                <label className={labelClass} htmlFor="deliveryCity">Town or community</label>
                <Input id="deliveryCity" name="deliveryCity" onChange={(event) => setAddress((current) => ({ ...current, town: event.target.value }))} required value={address.town} />
              </div>
              <div>
                <label className={labelClass} htmlFor="deliveryLga">LGA</label>
                <select className={selectClass} id="deliveryLga" name="deliveryLga" onChange={(event) => setAddress((current) => ({ ...current, lga: event.target.value }))} required value={address.lga}>
                  <option value="">Choose an LGA</option>
                  {ANAMBRA_LGAS.map((lga) => <option key={lga} value={lga}>{lga}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="deliveryState">State</label>
                <Input id="deliveryState" name="deliveryState" readOnly value="Anambra" />
              </div>
              <div className="sm:col-span-2" aria-live="polite">
                {quotePending ? <p className="flex items-center gap-2 text-sm font-semibold text-stone-700"><LoaderCircle aria-hidden="true" className="size-4 animate-spin text-primary" />Calculating delivery fee...</p> : null}
                {quoteError ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-900" role="alert">{quoteError}</p> : null}
                {quote ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Delivery fee ready: {formatNgn(quote.deliveryTotalMinor)}</p> : null}
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
            <div className="flex justify-between gap-4"><dt className="text-stone-600">Delivery Fee</dt><dd className="font-mono font-semibold text-stone-950">{fulfillmentMethod === "DELIVERY" && !quote ? (quotePending ? "Calculating..." : "Unavailable") : formatNgn(totals.deliveryTotalMinor)}</dd></div>
            <div className="mt-1 flex justify-between gap-4 border-t border-stone-200 pt-4"><dt className="font-bold text-stone-950">Total</dt><dd className="font-mono text-lg font-bold text-stone-950">{formatNgn(totals.totalMinor)}</dd></div>
          </dl>
          <div className="mt-6"><CheckoutSubmitButton disabled={!canCheckout} /></div>
        </aside>
      </div>
    </form>
  );
}
