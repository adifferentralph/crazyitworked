import { AdminSearch, AdminStatus, AdminTable } from "@/components/admin/admin-table";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireRole } from "@/lib/auth/principal";
import { getAdminProducts } from "@/lib/admin/operations";

const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole(["ADMIN"], "/admin/products");
  const { q } = await searchParams;
  const products = await getAdminProducts({ searchValue: q });
  return (
    <AdminShell description="All seller listings, including drafts and moderated marketplace products." title="Products">
      <AdminSearch defaultValue={q} placeholder="Search product, SKU or seller" />
      <AdminTable columns={["Product", "Seller", "SKU", "Price", "Stock", "Status"]} emptyMessage="No products match this search." rows={products.map((product) => [
        <span className="font-semibold text-stone-950" key="name">{product.name}</span>,
        product.storeName,
        <span className="font-mono text-xs" key="sku">{product.sku}</span>,
        money.format(product.priceMinor / 100),
        product.quantity,
        <AdminStatus key="status" value={product.status} />,
      ])} />
    </AdminShell>
  );
}
