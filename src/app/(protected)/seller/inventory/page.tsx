import Link from "next/link";
import { Boxes } from "lucide-react";

import { SellerShell } from "@/components/seller/seller-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { getSellerProducts } from "@/lib/marketplace/seller-data";

export default async function SellerInventoryPage() {
  const principal = await requireRole(["SELLER"], "/seller/inventory");
  const products = await getSellerProducts(principal.id);
  const totalUnits = products.reduce((sum, product) => sum + product.quantity, 0);
  const lowStock = products.filter((product) => product.quantity > 0 && product.quantity <= 5);

  return (
    <SellerShell description="Monitor real listing quantities and open a product to make a controlled stock adjustment." title="Inventory">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5"><dt className="text-sm font-semibold text-stone-500">Products</dt><dd className="mt-2 text-3xl font-semibold">{products.length}</dd></div>
        <div className="rounded-lg border border-stone-200 bg-white p-5"><dt className="text-sm font-semibold text-stone-500">Units in stock</dt><dd className="mt-2 text-3xl font-semibold">{totalUnits}</dd></div>
        <div className="rounded-lg border border-stone-200 bg-white p-5"><dt className="text-sm font-semibold text-stone-500">Low stock</dt><dd className="mt-2 text-3xl font-semibold">{lowStock.length}</dd></div>
      </dl>
      {products.length ? (
        <div className="mt-6 overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-stone-600"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Available</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Action</span></th></tr></thead>
            <tbody className="divide-y divide-stone-200">{products.map((product) => <tr key={product.id}><td className="px-4 py-3 font-semibold text-stone-950">{product.name}</td><td className="px-4 py-3 font-mono text-xs">{product.sku}</td><td className="px-4 py-3">{product.quantity}</td><td className="px-4 py-3 capitalize">{product.status.replaceAll("_", " ").toLowerCase()}</td><td className="px-4 py-3 text-right"><Button asChild size="sm" variant="outline"><Link href={`/seller/products/${product.id}/edit`}>Update</Link></Button></td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-stone-300 bg-white px-5 py-12 text-center"><Boxes aria-hidden="true" className="mx-auto size-9 text-stone-300" /><h2 className="mt-4 text-xl font-semibold">No inventory yet</h2><Button asChild className="mt-5"><Link href="/seller/products/new">Add Product</Link></Button></div>
      )}
    </SellerShell>
  );
}