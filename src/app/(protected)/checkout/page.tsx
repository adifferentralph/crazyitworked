import Link from "next/link";
import { AlertCircle, ChevronLeft, MapPin, ShieldCheck, ShoppingBag } from "lucide-react";

import { startKoraCheckoutAction } from "@/app/(protected)/checkout/actions";
import { AccountSectionPage } from "@/components/account/account-section-page";
import { CheckoutSubmitButton } from "@/components/commerce/checkout-submit-button";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { hasKoraEnvironment } from "@/lib/commerce/kora";
import { getBuyerCart } from "@/lib/marketplace/buyer-data";
import { formatNgn } from "@/lib/marketplace/products";

const checkoutErrors: Record<string, string> = {
  CART_EMPTY: "Your cart is empty. Add a part before checking out.",
  KORA_NOT_CONFIGURED: "Secure Kora payment still needs its server key.",
  PAYMENT_INITIALIZATION_FAILED:
    "We could not open secure payment. No charge was made; please try again.",
  PAYMENT_MISMATCH:
    "The verified payment details did not match this order. The payment is held for review.",
  PICKUP_UNAVAILABLE:
    "Every part must support pickup for this checkout. Remove the highlighted part or contact its supplier.",
  STOCK_CHANGED: "Available stock changed. Review your cart quantities and try again.",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const principal = await requireRole(["BUYER"], "/checkout");
  const [cart, query] = await Promise.all([
    getBuyerCart(principal.id),
    searchParams,
  ]);

  if (!cart.length) {
    return (
      <AccountSectionPage
        action="Browse parts"
        description="Complete a secure purchase from approved marketplace suppliers."
        emptyDescription="Add an approved part to your cart before starting checkout."
        emptyTitle="Nothing to check out"
        icon={ShoppingBag}
        title="Checkout"
      />
    );
  }

  const productSubtotal = cart.reduce(
    (sum, item) => sum + item.product.price_minor * item.quantity,
    0,
  );
  const delivery = 0;
  const total = productSubtotal + delivery;
  const unavailableItems = cart.filter(
    (item) => item.quantity > item.available || !item.product.pickup_available,
  );
  const koraConfigured = hasKoraEnvironment();
  const canCheckout = unavailableItems.length === 0 && koraConfigured;
  const errorMessage = query.error
    ? checkoutErrors[query.error] ?? checkoutErrors.PAYMENT_INITIALIZATION_FAILED
    : null;

  return (
    <AccountSectionPage
      description="Review the exact NGN total before continuing to Kora's secure payment page."
      icon={ShoppingBag}
      title="Checkout"
    >
      <Button asChild className="mb-5 px-0" variant="ghost">
        <Link href="/cart">
          <ChevronLeft aria-hidden="true" className="size-4" />
          Back to cart
        </Link>
      </Button>

      {errorMessage ? (
        <p
          className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900"
          role="alert"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {errorMessage}
        </p>
      ) : null}

      {!koraConfigured ? (
        <p
          className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          role="status"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Kora test credentials must be added on the server before payment can open.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-4">
          <section className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-stone-950">Pickup order</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Each supplier&apos;s collection location is preserved on the order. Delivery
              is not charged in this pickup checkout.
            </p>
          </section>

          {cart.map((item) => {
            const purchasable =
              item.quantity <= item.available && item.product.pickup_available;

            return (
              <article
                className="rounded-xl border border-stone-200 bg-white p-5"
                key={item.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-body text-base font-bold text-stone-950">
                      {item.product.name}
                    </h2>
                    <p className="mt-1 text-sm text-stone-600">
                      {item.sellerName} · Quantity {item.quantity}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
                      <MapPin aria-hidden="true" className="size-3.5 text-primary" />
                      Pickup in {item.product.city}, {item.product.state}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-bold text-stone-950">
                    {formatNgn(item.product.price_minor * item.quantity)}
                  </p>
                </div>
                {!purchasable ? (
                  <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-900">
                    {item.quantity > item.available
                      ? `Only ${item.available} currently available.`
                      : "This supplier has not enabled pickup for the part."}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>

        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-bold text-stone-950">Order summary</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-600">Product Price</dt>
              <dd className="font-mono font-semibold text-stone-950">
                {formatNgn(productSubtotal)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-600">Delivery</dt>
              <dd className="font-mono font-semibold text-stone-950">
                {formatNgn(delivery)}
              </dd>
            </div>
            <div className="mt-1 flex justify-between gap-4 border-t border-stone-200 pt-4">
              <dt className="font-bold text-stone-950">Total</dt>
              <dd className="font-mono text-lg font-bold text-stone-950">
                {formatNgn(total)}
              </dd>
            </div>
          </dl>

          <form action={startKoraCheckoutAction} className="mt-6">
            <CheckoutSubmitButton disabled={!canCheckout} />
          </form>

          <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-stone-500">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-700" />
            Kora handles payment details. Twenty-Two Parts never receives or stores your
            card number.
          </div>
        </aside>
      </div>
    </AccountSectionPage>
  );
}
