import { AdminSearch, AdminStatus, AdminTable } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/lib/auth/principal";
import { getAdminRfqs } from "@/lib/admin/operations";

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["ADMIN"], "/admin/requests");
  const { q } = await searchParams;
  const requests = await getAdminRfqs(q);
  return (
    <AdminShell description="Buyer part requests and RFQ status from the live marketplace workflow." title="Part Requests / RFQs">
      <AdminSearch defaultValue={q} placeholder="Search part name or buyer email" />
      <AdminTable columns={["Part", "Buyer", "Delivery", "Status", "Created"]} emptyMessage="No part requests match this search." rows={requests.map((request) => [
        <span className="font-semibold text-stone-950" key="part">{request.partName}</span>,
        request.buyerEmail,
        `${request.deliveryCity}, ${request.deliveryState}`,
        <AdminStatus key="status" value={request.status} />,
        request.createdAt.toLocaleDateString("en-NG"),
      ])} />
    </AdminShell>
  );
}
