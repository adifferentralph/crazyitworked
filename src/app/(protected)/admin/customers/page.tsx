import { AdminSearch, AdminStatus, AdminTable } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/lib/auth/principal";
import { getAdminCustomers } from "@/lib/admin/operations";

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["ADMIN"], "/admin/customers");
  const { q } = await searchParams;
  const customers = await getAdminCustomers(q);
  return (
    <AdminShell description="Non-sensitive buyer account and activity information. Authentication secrets are never available here." title="Buyers / Customers">
      <AdminSearch defaultValue={q} placeholder="Search name, email or phone" />
      <AdminTable columns={["Customer", "Contact", "Type", "Orders", "Last order", "Joined", "Status"]} emptyMessage="No customers match this search." rows={customers.map((customer) => [
        <span className="font-semibold text-stone-950" key="name">{customer.fullName}</span>,
        <span className="grid gap-1" key="contact"><span>{customer.email}</span><span className="text-xs text-stone-500">{customer.phone ?? "No phone"}</span></span>,
        customer.accountType.replaceAll("_", " "),
        customer.orderCount,
        customer.lastOrderAt ? customer.lastOrderAt.toLocaleDateString("en-NG") : "No orders",
        customer.joinedAt.toLocaleDateString("en-NG"),
        <AdminStatus key="status" value={customer.accountStatus} />,
      ])} />
    </AdminShell>
  );
}
