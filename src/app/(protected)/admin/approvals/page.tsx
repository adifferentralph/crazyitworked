import { AdminSearch, AdminStatus, AdminTable } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/lib/auth/principal";
import { getAdminProducts } from "@/lib/admin/operations";

export default async function AdminApprovalsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["ADMIN"], "/admin/approvals");
  const { q } = await searchParams;
  const products = await getAdminProducts({ pendingOnly: true, searchValue: q });
  return (
    <AdminShell description="Listings currently waiting for marketplace review. Approval controls remain permission-scoped." title="Listings / Approvals">
      <AdminSearch defaultValue={q} placeholder="Search pending product, SKU or seller" />
      <AdminTable columns={["Product", "Seller", "SKU", "Submitted", "Status"]} emptyMessage="No products are pending review." rows={products.map((product) => [
        <span className="font-semibold text-stone-950" key="name">{product.name}</span>,
        product.storeName,
        <span className="font-mono text-xs" key="sku">{product.sku}</span>,
        product.createdAt.toLocaleDateString("en-NG"),
        <AdminStatus key="status" value={product.status} />,
      ])} />
    </AdminShell>
  );
}
