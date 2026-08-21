import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CarFront, MapPin, PackageSearch, XCircle } from "lucide-react";
import { notFound } from "next/navigation";

import { declinePartRequestAction, submitPartQuoteAction } from "@/app/(protected)/rfq-actions";
import { QuoteSubmitButton } from "@/components/rfq/quote-submit-button";
import { SellerShell } from "@/components/seller/seller-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { formatNgn, priceMinorToInput } from "@/lib/marketplace/products";
import { getSellerMatchedRequest } from "@/lib/rfq/data";

const inputClass = "h-12 w-full rounded-md border border-stone-300 bg-white px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default async function SellerRequestDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ quote?: string }> }) {
  const principal = await requireRole(["SELLER"], "/seller/requests");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await getSellerMatchedRequest(id, principal.id);
  if (!detail) notFound();
  const { request, match, quote, products, vehicle, images } = detail;
  const canQuote = ["OPEN", "QUOTED"].includes(request.status) && !["ACCEPTED", "REJECTED", "WITHDRAWN"].includes(quote?.status ?? "");

  return (
    <SellerShell description="Use the buyer's exact request details to prepare an accurate, auditable quote." title={request.part_name}>
      <Button asChild size="sm" variant="ghost"><Link href="/seller/requests"><ArrowLeft className="size-4" aria-hidden="true" />Back to requests</Link></Button>
      {query.quote === "submitted" ? <p className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900" role="status">Quote submitted to the buyer.</p> : null}
      {query.quote === "error" ? <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900" role="alert">The quote could not be submitted. Check its values and try again.</p> : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid content-start gap-6">
          <section className="rounded-xl border border-stone-200 bg-white p-5 sm:p-7"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold capitalize">{request.status.toLowerCase()}</span>{match.category_matched ? <span className="text-xs font-semibold text-emerald-700">Category matched</span> : null}</div><h2 className="mt-5 text-2xl font-semibold">Buyer requirements</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-700">{request.description}</p><dl className="mt-5 grid gap-3 border-t border-stone-200 pt-5 text-sm sm:grid-cols-2"><div><dt className="text-stone-500">Quantity</dt><dd className="font-semibold">{request.quantity}</dd></div><div><dt className="text-stone-500">Conditions</dt><dd className="font-semibold">{request.condition_preferences.length ? request.condition_preferences.map((value) => value.replaceAll("_", " ").toLowerCase()).join(", ") : "Any suitable condition"}</dd></div><div><dt className="text-stone-500">OEM number</dt><dd className="font-mono">{request.oem_part_number ?? "Not provided"}</dd></div><div><dt className="text-stone-500">Manufacturer number</dt><dd className="font-mono">{request.manufacturer_part_number ?? "Not provided"}</dd></div><div><dt className="text-stone-500">Budget</dt><dd className="font-semibold">{request.budget_min_minor || request.budget_max_minor ? `${request.budget_min_minor ? formatNgn(request.budget_min_minor) : "No minimum"} – ${request.budget_max_minor ? formatNgn(request.budget_max_minor) : "No maximum"}` : "Not specified"}</dd></div></dl><div className="mt-5 grid gap-3 text-sm"><p className="flex items-start gap-2"><CarFront className="mt-0.5 size-4 text-primary" aria-hidden="true" />{vehicle?.label ?? "No exact vehicle selected"}</p><p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 text-primary" aria-hidden="true" />{request.delivery_city}, {request.delivery_state}</p></div></section>
          {images.length ? <section className="rounded-xl border border-stone-200 bg-white p-5 sm:p-7"><h2 className="text-2xl font-semibold">Buyer photos</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image) => image.signedUrl ? <div className="relative aspect-square overflow-hidden rounded-md bg-stone-100" key={image.id}><Image alt={image.original_filename} className="object-cover" fill sizes="240px" src={image.signedUrl} unoptimized /></div> : null)}</div></section> : null}
        </div>
        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center gap-2"><PackageSearch className="size-5 text-primary" aria-hidden="true" /><h2 className="font-body text-xl font-bold">{quote ? "Revise your quote" : "Submit a quote"}</h2></div>
          {quote ? <p className="mt-2 text-sm capitalize text-stone-600">Current status: {quote.status.toLowerCase()}</p> : null}
          {canQuote ? <form action={submitPartQuoteAction} className="mt-5 grid gap-4"><input name="requestId" type="hidden" value={request.id} /><div className="grid gap-2"><label className="text-sm font-semibold" htmlFor="productId">Your listed product (optional)</label><select className={inputClass} defaultValue={quote?.product_id ?? ""} id="productId" name="productId"><option value="">Quote without linking a listing</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.sku} · {product.status.toLowerCase()}</option>)}</select></div><div className="grid gap-2"><label className="text-sm font-semibold" htmlFor="quoteQuantity">Quantity</label><input className={inputClass} defaultValue={quote?.quantity ?? request.quantity} id="quoteQuantity" max="1000" min="1" name="quantity" type="number" /></div><div className="grid gap-2"><label className="text-sm font-semibold" htmlFor="unitPriceNgn">Unit price (NGN)</label><input className={inputClass} defaultValue={quote ? priceMinorToInput(quote.unit_price_minor) : ""} id="unitPriceNgn" inputMode="decimal" name="unitPriceNgn" placeholder="45000" required /></div><div className="grid gap-2"><label className="text-sm font-semibold" htmlFor="deliveryFeeNgn">Delivery fee (NGN)</label><input className={inputClass} defaultValue={quote ? priceMinorToInput(quote.delivery_fee_minor) : "0"} id="deliveryFeeNgn" inputMode="decimal" name="deliveryFeeNgn" /></div><div className="grid gap-2"><label className="text-sm font-semibold" htmlFor="estimatedDeliveryDays">Estimated delivery days</label><input className={inputClass} defaultValue={quote?.estimated_delivery_days ?? ""} id="estimatedDeliveryDays" max="365" min="1" name="estimatedDeliveryDays" type="number" /></div><div className="grid gap-2"><label className="text-sm font-semibold" htmlFor="validUntil">Quote valid until</label><input className={inputClass} defaultValue={quote?.valid_until?.slice(0, 10) ?? ""} id="validUntil" name="validUntil" type="date" /></div><div className="grid gap-2"><label className="text-sm font-semibold" htmlFor="quoteNotes">Notes</label><textarea className="min-h-28 rounded-md border border-stone-300 p-3" defaultValue={quote?.notes ?? ""} id="quoteNotes" maxLength={1500} name="notes" placeholder="Brand, condition, warranty, pickup or delivery details..." /></div><QuoteSubmitButton /></form> : <p className="mt-5 rounded-md bg-stone-50 p-4 text-sm text-stone-600">This request or quote is no longer open for changes.</p>}
          {!quote && ["OPEN", "QUOTED"].includes(request.status) ? <form action={declinePartRequestAction} className="mt-3"><input name="requestId" type="hidden" value={request.id} /><Button className="w-full" type="submit" variant="ghost"><XCircle className="size-4" aria-hidden="true" />Decline request</Button></form> : null}
        </aside>
      </div>
    </SellerShell>
  );
}