import { AdminSearch, AdminStatus, AdminTable } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/lib/auth/principal";
import { formatAdminDate } from "@/lib/admin/format";
import { getAdminOrders } from "@/lib/admin/operations";

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["ADMIN"], "/admin/orders");
  const { q } = await searchParams;
  const orders = await getAdminOrders(q);
  return (
    <AdminShell description="Marketplace orders and payment state. Financial mutations remain in the dedicated permission boundary." title="Orders">
      <AdminSearch defaultValue={q} placeholder="Search order number or buyer email" />
      <AdminTable columns={["Order", "Buyer", "Products", "Delivery allocation", "Total", "Order status", "Payment", "Created"]} emptyMessage="No orders match this search." rows={orders.map((order) => [
        <span className="font-mono text-xs font-bold text-stone-950" key="order">{order.orderNumber}</span>,
        order.buyerEmail,
        money.format(order.productSubtotalMinor / 100),
        <span className="text-xs" key="delivery">Customer {money.format(order.deliveryTotalMinor / 100)}<br />Cost {money.format(order.actualDeliveryCostMinor / 100)} · Platform {money.format(order.platformServiceComponentMinor / 100)}<br />{order.shipmentCount} shipment{order.shipmentCount === 1 ? "" : "s"}</span>,
        money.format(order.totalMinor / 100),
        <AdminStatus key="order-status" value={order.status} />,
        <AdminStatus key="payment-status" value={order.paymentStatus} />,
        formatAdminDate(order.createdAt),
      ])} />
    </AdminShell>
  );
}
