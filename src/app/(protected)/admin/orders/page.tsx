import { AdminSearch, AdminStatus, AdminTable } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/lib/auth/principal";
import { getAdminOrders } from "@/lib/admin/operations";

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["ADMIN"], "/admin/orders");
  const { q } = await searchParams;
  const orders = await getAdminOrders(q);
  return (
    <AdminShell description="Marketplace orders and payment state. Financial mutations remain in the dedicated permission boundary." title="Orders">
      <AdminSearch defaultValue={q} placeholder="Search order number or buyer email" />
      <AdminTable columns={["Order", "Buyer", "Total", "Order status", "Payment", "Created"]} emptyMessage="No orders match this search." rows={orders.map((order) => [
        <span className="font-mono text-xs font-bold text-stone-950" key="order">{order.orderNumber}</span>,
        order.buyerEmail,
        money.format(order.totalMinor / 100),
        <AdminStatus key="order-status" value={order.status} />,
        <AdminStatus key="payment-status" value={order.paymentStatus} />,
        order.createdAt.toLocaleDateString("en-NG"),
      ])} />
    </AdminShell>
  );
}
