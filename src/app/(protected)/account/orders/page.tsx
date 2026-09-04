import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { getBuyerOrders } from "@/lib/commerce/orders";
import { formatNgn } from "@/lib/marketplace/products";

function formatOrderStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
}

export default async function AccountOrdersPage() {
  const principal = await requireRole(["BUYER"], "/account/orders");
  const orders = await getBuyerOrders(principal.id);

  if (!orders.length) {
    return (
      <AccountSectionPage
        action="Browse parts"
        actionHref="/marketplace"
        description="Track purchases, fulfilment, and completed orders in one place."
        emptyDescription="Your verified marketplace purchases will appear here."
        emptyTitle="No orders yet"
        icon={ClipboardList}
        title="My Orders"
      />
    );
  }

  return (
    <AccountSectionPage
      description="Track purchases, fulfilment, and completed orders in one place."
      icon={ClipboardList}
      title="My Orders"
    >
      <div className="grid gap-4">
        {orders.map((order) => (
          <article
            className="rounded-xl border border-stone-200 bg-white p-5"
            key={order.id}
          >
            <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-sm font-bold text-stone-950">
                  {order.orderNumber}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {new Intl.DateTimeFormat("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(order.createdAt)}
                </p>
              </div>
              <span className="w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-bold capitalize text-stone-700">
                {formatOrderStatus(order.status)}
              </span>
            </div>

            <ul className="divide-y divide-stone-100">
              {order.items.map((item) => (
                <li
                  className="flex items-start justify-between gap-4 py-4 text-sm"
                  key={item.id}
                >
                  <div>
                    <Link
                      className="font-semibold text-stone-950 underline-offset-4 hover:underline"
                      href={`/parts/${item.productSlug}`}
                    >
                      {item.productName}
                    </Link>
                    <p className="mt-1 text-stone-500">
                      {item.sku} · Quantity {item.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono font-semibold text-stone-950">
                    {formatNgn(item.productTotalMinor)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="grid gap-2 border-t border-stone-200 pt-4 text-sm sm:ml-auto sm:w-72">
              <div className="flex justify-between gap-4">
                <dt className="text-stone-600">Product Price</dt>
                <dd className="font-mono font-semibold">
                  {formatNgn(order.productSubtotalMinor)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-600">Delivery</dt>
                <dd className="font-mono font-semibold">
                  {formatNgn(order.deliveryTotalMinor)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 font-bold">
                <dt>Total</dt>
                <dd className="font-mono">{formatNgn(order.totalMinor)}</dd>
              </div>
            </dl>

            {order.status === "PENDING_PAYMENT" ? (
              <Button asChild className="mt-5" size="sm" variant="outline">
                <Link
                  href={`/checkout/return?reference=${encodeURIComponent(
                    order.orderNumber,
                  )}`}
                >
                  Check payment status
                </Link>
              </Button>
            ) : null}
          </article>
        ))}
      </div>
    </AccountSectionPage>
  );
}
