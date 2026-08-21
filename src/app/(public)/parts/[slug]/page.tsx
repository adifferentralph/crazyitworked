import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Box, CarFront, MapPin, PackageCheck, ScanLine, Star, Truck } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNgn } from "@/lib/marketplace/products";
import { getMarketplaceProduct } from "@/lib/marketplace/public-catalog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getMarketplaceProduct(slug);
  if (!detail) return { title: "Part not found" };
  return {
    description: detail.product.description.slice(0, 155),
    title: detail.product.name,
  };
}

export default async function PartDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getMarketplaceProduct(slug);
  if (!detail) notFound();
  const { product, seller, images, fitments, crossReferences } = detail;
  const primary = images.find((image) => image.is_primary) ?? images[0];

  return (
    <section className="min-h-[70vh] bg-white py-10 sm:py-14">
      <div className="container-page">
        <Button asChild size="sm" variant="ghost"><Link href="/find-a-part"><ArrowLeft className="size-4" aria-hidden="true" />Back to marketplace</Link></Button>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
              {primary?.signedUrl ? <Image alt={`${product.name} main product image`} className="object-contain" fill priority sizes="(max-width: 1024px) 100vw, 58vw" src={primary.signedUrl} unoptimized /> : <div className="grid size-full place-items-center text-sm text-stone-500">No marketplace image available</div>}
            </div>
            {images.length > 1 ? <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">{images.map((image) => image.signedUrl ? <figure className="overflow-hidden rounded-md border border-stone-200" key={image.id}><div className="relative aspect-square bg-stone-100"><Image alt={`${product.name} ${image.type.toLowerCase().replaceAll("_", " ")} image`} className="object-cover" fill sizes="160px" src={image.signedUrl} unoptimized /></div><figcaption className="px-2 py-1.5 text-[11px] font-semibold capitalize text-stone-600">{image.type.replaceAll("_", " ").toLowerCase()}</figcaption></figure> : null)}</div> : null}
          </div>

          <aside>
            <div className="flex flex-wrap gap-2"><Badge variant="outline" className="capitalize">{product.condition.replaceAll("_", " ").toLowerCase()}</Badge><Badge variant={product.quantity > 0 ? "default" : "muted"}>{product.quantity > 0 ? "In stock" : "Out of stock"}</Badge></div>
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-primary">{detail.categoryName}</p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">{product.name}</h1>
            <p className="mt-5 text-3xl font-semibold text-stone-950">{formatNgn(product.price_minor)}</p>
            <div className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-[#fffdf9] p-5 text-sm text-stone-700">
              <p className="flex items-center gap-2"><PackageCheck className="size-4 text-primary" aria-hidden="true" /><span className="font-semibold text-stone-950">{seller?.store_name ?? "Marketplace supplier"}</span></p>
              <p className="flex items-center gap-2"><BadgeCheck className="size-4 text-primary" aria-hidden="true" />Verification: {(seller?.verification_status ?? "submitted").replaceAll("_", " ").toLowerCase()}</p>
              <p className="flex items-center gap-2"><Star className="size-4 text-primary" aria-hidden="true" />No reviews yet</p>
              <p className="flex items-center gap-2"><MapPin className="size-4 text-primary" aria-hidden="true" />{product.city}, {product.state}, Nigeria</p>
              <p className="flex items-center gap-2"><Truck className="size-4 text-primary" aria-hidden="true" />{[product.pickup_available ? "Pickup" : null, product.delivery_available ? "Delivery" : null].filter(Boolean).join(" and ")} available</p>
            </div>
            <dl className="mt-6 grid gap-3 border-y border-stone-200 py-5 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-stone-500">Brand</dt><dd className="font-semibold">{product.brand}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">Quantity available</dt><dd className="font-semibold">{product.quantity}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">OEM number</dt><dd className="font-mono">{product.oem_part_number ?? "Not provided"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-stone-500">Manufacturer number</dt><dd className="font-mono">{product.manufacturer_part_number ?? "Not provided"}</dd></div>
            </dl>
          </aside>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-stone-200 bg-white p-6"><div className="flex items-center gap-2"><Box className="size-5 text-primary" aria-hidden="true" /><h2 className="text-2xl font-semibold">Part description</h2></div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-700">{product.description}</p>{crossReferences.length ? <div className="mt-5 border-t border-stone-200 pt-4"><p className="flex items-center gap-2 text-sm font-semibold"><ScanLine className="size-4 text-primary" aria-hidden="true" />Cross-reference numbers</p><p className="mt-2 font-mono text-sm text-stone-600">{crossReferences.join(" · ")}</p></div> : null}</section>
          <section className="rounded-lg border border-stone-200 bg-[#fffdf9] p-6"><div className="flex items-center gap-2"><CarFront className="size-5 text-primary" aria-hidden="true" /><h2 className="text-2xl font-semibold">Seller-provided vehicle compatibility</h2></div>{fitments.length ? <ul className="mt-4 grid gap-3">{fitments.map((fitment) => <li className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900" key={fitment.id}><BadgeCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Seller lists compatibility with {fitment.label}</li>)}</ul> : <p className="mt-4 text-sm leading-6 text-stone-600">No vehicle compatibility has been attached to this listing. Match by exact part number and confirm with the supplier before ordering.</p>}</section>
        </div>

        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6"><div className="flex items-center gap-2"><Star className="size-5 text-primary" aria-hidden="true" /><h2 className="text-2xl font-semibold">Buyer reviews</h2></div><p className="mt-3 text-sm text-stone-600">No verified-purchase reviews have been submitted for this part yet.</p></section>
      </div>
    </section>
  );
}
