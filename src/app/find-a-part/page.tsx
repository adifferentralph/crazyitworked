import type { Metadata } from "next";
import Link from "next/link";
import { PackageSearch, RotateCcw } from "lucide-react";

import { MarketplaceSearchForm } from "@/components/marketplace/marketplace-search-form";
import { ProductCard } from "@/components/marketplace/product-card";
import { Button } from "@/components/ui/button";
import {
  getMarketplaceOptions,
  parseMarketplaceSearch,
  searchMarketplaceProducts,
} from "@/lib/marketplace/public-catalog";

export const metadata: Metadata = {
  description: "Search approved automotive parts by name, OEM number, brand, category, location, and verified vehicle fitment.",
  title: "Find an automotive part",
};

export default async function FindAPartPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const search = parseMarketplaceSearch(raw);
  const [options, result] = await Promise.all([
    getMarketplaceOptions(),
    searchMarketplaceProducts(search),
  ]);
  const selectedVehicle = options.vehicles.find((vehicle) => vehicle.id === search.vehicle);
  const pages = Math.max(1, Math.ceil(result.count / result.pageSize));

  return (
    <section className="min-h-[70vh] bg-white py-12 sm:py-16">
      <div className="container-page">
        <header className="max-w-3xl">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">Approved marketplace</p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-950 sm:text-5xl">Find the right part with clearer evidence.</h1>
          <p className="mt-4 text-base leading-7 text-stone-600">Search live, approved supplier listings by part number or progressively narrow to one verified vehicle configuration.</p>
        </header>

        <div className="mt-8"><MarketplaceSearchForm options={options} search={search} /></div>

        <div className="mt-10 flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-semibold text-stone-500">{result.count} approved {result.count === 1 ? "part" : "parts"}</p><h2 className="mt-1 text-3xl font-semibold text-stone-950">{search.q ? `Results for “${search.q}”` : "Marketplace parts"}</h2></div>
          {(search.q || search.category || search.vehicle || search.brand || search.location) ? <Button asChild size="sm" variant="ghost"><Link href="/find-a-part"><RotateCcw className="size-4" aria-hidden="true" />Clear search</Link></Button> : null}
        </div>

        {result.products.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{result.products.map((product) => <ProductCard key={product.id} product={product} vehicle={selectedVehicle} />)}</div> : <div className="mt-6 rounded-lg border border-dashed border-stone-300 bg-[#fffdf9] px-6 py-16 text-center"><PackageSearch className="mx-auto size-10 text-stone-400" aria-hidden="true" /><h2 className="mt-4 text-2xl font-semibold text-stone-950">No approved parts match yet</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">Try a broader part name, remove one filter, or search using an OEM or manufacturer number.</p><Button asChild className="mt-6" variant="outline"><Link href="/find-a-part">Reset search</Link></Button></div>}

        {pages > 1 ? <nav aria-label="Search result pages" className="mt-10 flex justify-center gap-2">{Array.from({ length: Math.min(pages, 10) }, (_, index) => index + 1).map((page) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && key !== "page") params.set(key, value); params.set("page", String(page)); return <Button asChild key={page} size="sm" variant={page === search.page ? "default" : "outline"}><Link aria-current={page === search.page ? "page" : undefined} href={`/find-a-part?${params.toString()}`}>{page}</Link></Button>; })}</nav> : null}
      </div>
    </section>
  );
}
