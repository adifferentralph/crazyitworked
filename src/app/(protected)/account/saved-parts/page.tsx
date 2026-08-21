import Link from "next/link";
import { Heart, MapPin } from "lucide-react";

import { toggleSavedPartAction } from "@/app/(protected)/commerce-actions";
import { AccountSectionPage } from "@/components/account/account-section-page";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { getBuyerSavedProducts } from "@/lib/marketplace/buyer-data";
import { formatNgn } from "@/lib/marketplace/products";

export default async function SavedPartsPage() {
  const principal = await requireRole(["BUYER"], "/account/saved-parts");
  const saved = await getBuyerSavedProducts(principal.id);

  return (
    <AccountSectionPage
      action={saved.length ? undefined : "Browse parts"}
      description="Keep approved marketplace parts here while you compare price, location, and fitment."
      emptyDescription="Use Save part on a marketplace listing to keep it here."
      emptyTitle="No saved parts"
      icon={Heart}
      title="Saved Parts"
    >
      {saved.length ? <div className="grid gap-3 sm:grid-cols-2">{saved.map(({ product }) => (
        <article className="rounded-xl border border-stone-200 bg-white p-5" key={product.id}>
          <h2 className="font-body text-lg font-bold text-stone-950"><Link href={`/parts/${product.slug}`}>{product.name}</Link></h2>
          <p className="mt-3 text-xl font-semibold text-stone-950">{formatNgn(product.price_minor)}</p>
          <p className="mt-2 flex items-center gap-2 text-sm text-stone-600"><MapPin className="size-4 text-primary" aria-hidden="true" />{product.city}, {product.state}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm"><Link href={`/parts/${product.slug}`}>View part</Link></Button>
            <form action={toggleSavedPartAction}>
              <input name="productId" type="hidden" value={product.id} />
              <Button size="sm" type="submit" variant="outline">Remove</Button>
            </form>
          </div>
        </article>
      ))}</div> : undefined}
    </AccountSectionPage>
  );
}