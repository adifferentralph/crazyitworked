import { ClipboardList, MapPin } from "lucide-react";

import { SellerShell } from "@/components/seller/seller-shell";
import { requireRole } from "@/lib/auth/principal";
import { getSellerOrders } from "@/lib/commerce/orders";
import { formatNgn } from "@/lib/marketplace/products";

export default async function SellerOrdersPage() {
  const principal = await requireRole(["SELLER"], "/seller/orders");
  const orders = await getSellerOrders(principal.id);

  return (
    <SellerShell
      description="Paid marketplace order items assigned to your store."
      title="Store Orders"
    >
      {!orders.length ? (
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-12 text-center">
          <ClipboardList
            aria-hidden="true"
            className="mx-auto size-9 text-stone-300"
          />
          <h2 className="mt-4 text-xl font-semibold text-stone-950">
            No paid store orders yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
            Your products from verified buyer payments will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <article
              className="rounded-xl border border-stone-200 bg-white p-5"
              key={`${order.orderNumber}-${order.sku}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-xs font-bold text-primary">
                    {order.orderNumber}
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-stone-950">
                    {order.productName}
                  </h2>
                  <p className="mt-1 text-sm text-stone-600">
                    {order.sku} · Quantity {order.quantity}
                  </p>
                </div>
                <p className="font-mono text-base font-bold text-stone-950">
                  {formatNgn(order.productTotalMinor)}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-stone-200 pt-4 text-xs text-stone-500">
                <span className="capitalize">{order.orderStatus.toLowerCase()}</span>
                <span>
                  {new Intl.DateTimeFormat("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(order.paidAt ?? order.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin aria-hidden="true" className="size-3.5 text-primary" />
                  Pickup in {order.pickupCity}, {order.pickupState}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </SellerShell>
  );
}
