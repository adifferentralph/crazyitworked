import Link from "next/link";
import { AlertCircle, ChevronLeft, ShoppingBag } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";
import { CheckoutExperience } from "@/components/commerce/checkout-experience";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { hasKoraEnvironment } from "@/lib/commerce/kora";
import { getBuyerCart } from "@/lib/marketplace/buyer-data";

const checkoutErrors: Record<string, string> = {
  CART_EMPTY: "Your cart is empty. Add a part before checking out.",
  DELIVERY_DETAILS_REQUIRED: "Enter a complete delivery address and phone number.",
  DELIVERY_UNAVAILABLE: "Every part must support delivery for this checkout. Choose pickup or review your cart.",
  KORA_NOT_CONFIGURED: "Checkout is temporarily unavailable. Please try again later.",
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

  const paymentConfigured = hasKoraEnvironment();
  const errorMessage = query.error
    ? checkoutErrors[query.error] ?? checkoutErrors.PAYMENT_INITIALIZATION_FAILED
    : null;

  return (
    <AccountSectionPage
      description="Choose pickup or delivery and review your order total."
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

      {!paymentConfigured ? (
        <p
          className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          role="status"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Checkout is temporarily unavailable. Please try again later.
        </p>
      ) : null}

      <CheckoutExperience cart={cart} paymentConfigured={paymentConfigured} />
    </AccountSectionPage>
  );
}
