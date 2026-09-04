import Link from "next/link";
import { CheckCircle2, Clock3, ReceiptText, TriangleAlert } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import {
  getBuyerOrders,
  verifyAndFulfillKoraPayment,
} from "@/lib/commerce/orders";
import { formatNgn } from "@/lib/marketplace/products";

function safeReference(value: string | undefined) {
  return value && /^[A-Z0-9-]{8,80}$/i.test(value) ? value : null;
}

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  const principal = await requireRole(["BUYER"], "/checkout/return");
  const query = await searchParams;
  const reference = safeReference(query.reference);
  let verificationState: "ERROR" | "PAID" | "PENDING" = "PENDING";

  if (reference) {
    try {
      const result = await verifyAndFulfillKoraPayment(reference);
      verificationState = result.status === "PAID" ? "PAID" : "PENDING";
    } catch {
      verificationState = "ERROR";
    }
  } else {
    verificationState = "ERROR";
  }

  const buyerOrders = await getBuyerOrders(principal.id);
  const order = reference
    ? buyerOrders.find((candidate) => candidate.orderNumber === reference)
    : null;

  if (!order) {
    verificationState = "ERROR";
  } else if (order.paymentStatus === "PAID") {
    verificationState = "PAID";
  }

  const StateIcon =
    verificationState === "PAID"
      ? CheckCircle2
      : verificationState === "ERROR"
        ? TriangleAlert
        : Clock3;

  return (
    <AccountSectionPage
      description="Kora's redirect is never treated as payment proof. This page checks the payment directly with Kora."
      icon={ReceiptText}
      title="Payment status"
    >
      <div className="mx-auto max-w-2xl rounded-xl border border-stone-200 bg-white p-6 sm:p-8">
        <StateIcon
          aria-hidden="true"
          className={
            verificationState === "PAID"
              ? "size-10 text-emerald-700"
              : verificationState === "ERROR"
                ? "size-10 text-red-700"
                : "size-10 text-amber-700"
          }
        />
        <h2 className="mt-5 text-2xl font-semibold text-stone-950">
          {verificationState === "PAID"
            ? "Payment verified"
            : verificationState === "ERROR"
              ? "Payment needs attention"
              : "Payment is still being verified"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {verificationState === "PAID"
            ? "Your order is confirmed and the suppliers can now see their paid order items."
            : verificationState === "ERROR"
              ? "We could not safely match this return to your order. Check your orders before trying another payment."
              : "Do not pay again yet. Kora may still be sending the final payment notification."}
        </p>

        {order ? (
          <dl className="mt-6 grid gap-3 border-y border-stone-200 py-5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-stone-600">Order</dt>
              <dd className="font-mono font-bold text-stone-950">{order.orderNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-600">Product Price</dt>
              <dd className="font-mono font-semibold text-stone-950">
                {formatNgn(order.productSubtotalMinor)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-stone-600">Delivery</dt>
              <dd className="font-mono font-semibold text-stone-950">
                {formatNgn(order.deliveryTotalMinor)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-bold text-stone-950">Total</dt>
              <dd className="font-mono font-bold text-stone-950">
                {formatNgn(order.totalMinor)}
              </dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/account/orders">View my orders</Link>
          </Button>
          {verificationState === "PENDING" && reference ? (
            <Button asChild variant="outline">
              <Link href={`/checkout/return?reference=${encodeURIComponent(reference)}`}>
                Check again
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/marketplace">Return to marketplace</Link>
            </Button>
          )}
        </div>
      </div>
    </AccountSectionPage>
  );
}
