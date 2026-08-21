import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CarFront, CheckCircle2, FileQuestion, MapPin, PackageCheck, XCircle } from "lucide-react";
import { notFound } from "next/navigation";

import { acceptPartRequestQuoteAction, cancelPartRequestAction } from "@/app/(protected)/rfq-actions";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { formatNgn } from "@/lib/marketplace/products";
import { getBuyerPartRequest } from "@/lib/rfq/data";

export default async function BuyerRequestDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ message?: string }> }) {
  const principal = await requireRole(["BUYER"], "/account/requests");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await getBuyerPartRequest(id, principal.id);
  if (!detail) notFound();
  const { request, quotes, images, events, vehicle } = detail;
  const canCancel = ["OPEN", "QUOTED"].includes(request.status);

  return (
    <section className="min-h-screen bg-stone-50 py-8 sm:py-12">
      <div className="container-page">
        <Button asChild size="sm" variant="ghost"><Link href="/account/requests"><ArrowLeft className="size-4" aria-hidden="true" />Back to requests</Link></Button>
        {query.message === "submitted" ? <p className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900" role="status">Your request was submitted to matched verified suppliers.</p> : null}
        {query.message === "accepted" ? <p className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900" role="status">Quote accepted. The request is now recorded as accepted.</p> : null}
        <div className="mt-5 flex flex-col gap-4 border-b border-stone-200 pb-7 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-primary">{request.status.replaceAll("_", " ")}</p><h1 className="mt-2 text-3xl font-semibold text-stone-950 sm:text-4xl">{request.part_name}</h1><p className="mt-2 text-sm text-stone-600">Submitted {new Intl.DateTimeFormat("en-NG", { dateStyle: "long" }).format(new Date(request.submitted_at ?? request.created_at))}</p></div>
          {canCancel ? <form action={cancelPartRequestAction}><input name="requestId" type="hidden" value={request.id} /><Button type="submit" variant="outline"><XCircle className="size-4" aria-hidden="true" />Cancel request</Button></form> : null}
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid content-start gap-6">
            <section className="rounded-xl border border-stone-200 bg-white p-5 sm:p-7"><h2 className="text-2xl font-semibold text-stone-950">Request details</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-stone-700">{request.description}</p><dl className="mt-5 grid gap-3 border-t border-stone-200 pt-5 text-sm sm:grid-cols-2"><div><dt className="text-stone-500">Category</dt><dd className="mt-1 font-semibold">{detail.categoryName}</dd></div><div><dt className="text-stone-500">Quantity</dt><dd className="mt-1 font-semibold">{request.quantity}</dd></div><div><dt className="text-stone-500">OEM number</dt><dd className="mt-1 font-mono">{request.oem_part_number ?? "Not provided"}</dd></div><div><dt className="text-stone-500">Manufacturer number</dt><dd className="mt-1 font-mono">{request.manufacturer_part_number ?? "Not provided"}</dd></div><div><dt className="text-stone-500">Condition</dt><dd className="mt-1 font-semibold">{request.condition_preferences.length ? request.condition_preferences.map((value) => value.replaceAll("_", " ").toLowerCase()).join(", ") : "Any suitable condition"}</dd></div><div><dt className="text-stone-500">Budget</dt><dd className="mt-1 font-semibold">{request.budget_min_minor || request.budget_max_minor ? `${request.budget_min_minor ? formatNgn(request.budget_min_minor) : "No minimum"} – ${request.budget_max_minor ? formatNgn(request.budget_max_minor) : "No maximum"}` : "Not specified"}</dd></div></dl></section>
            {images.length ? <section className="rounded-xl border border-stone-200 bg-white p-5 sm:p-7"><h2 className="text-2xl font-semibold">Reference photos</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map((image) => image.signedUrl ? <div className="relative aspect-square overflow-hidden rounded-md bg-stone-100" key={image.id}><Image alt={image.original_filename} className="object-cover" fill sizes="240px" src={image.signedUrl} unoptimized /></div> : null)}</div></section> : null}
            <section className="rounded-xl border border-stone-200 bg-white p-5 sm:p-7"><div className="flex items-center gap-2"><PackageCheck className="size-5 text-primary" aria-hidden="true" /><h2 className="text-2xl font-semibold">Supplier quotes</h2></div>{quotes.length ? <div className="mt-5 grid gap-4">{quotes.map((quote) => { const total = quote.unit_price_minor * quote.quantity + quote.delivery_fee_minor; const actionable = request.status === "QUOTED" && ["SUBMITTED", "REVISED"].includes(quote.status); return <article className={`rounded-lg border p-5 ${quote.status === "ACCEPTED" ? "border-emerald-300 bg-emerald-50" : "border-stone-200 bg-white"}`} key={quote.id}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-bold text-stone-950">{quote.seller?.store_name ?? "Matched supplier"}</p><p className="mt-1 text-xs capitalize text-stone-500">{quote.status.toLowerCase()}</p></div><p className="text-2xl font-semibold">{formatNgn(total)}</p></div><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><div><dt className="text-stone-500">Unit price</dt><dd className="font-semibold">{formatNgn(quote.unit_price_minor)}</dd></div><div><dt className="text-stone-500">Delivery</dt><dd className="font-semibold">{formatNgn(quote.delivery_fee_minor)}</dd></div><div><dt className="text-stone-500">Estimate</dt><dd className="font-semibold">{quote.estimated_delivery_days ? `${quote.estimated_delivery_days} days` : "Not specified"}</dd></div></dl>{quote.notes ? <p className="mt-4 text-sm leading-6 text-stone-600">{quote.notes}</p> : null}{actionable ? <form action={acceptPartRequestQuoteAction} className="mt-4"><input name="quoteId" type="hidden" value={quote.id} /><Button type="submit"><CheckCircle2 className="size-4" aria-hidden="true" />Accept quote</Button></form> : null}</article>; })}</div> : <div className="mt-5 rounded-lg border border-dashed border-stone-300 p-8 text-center"><FileQuestion className="mx-auto size-8 text-stone-300" aria-hidden="true" /><p className="mt-3 text-sm text-stone-600">No supplier has submitted a quote yet.</p></div>}</section>
          </div>
          <aside className="grid h-fit gap-5">
            <div className="rounded-xl border border-stone-200 bg-white p-5"><h2 className="font-body text-lg font-bold">Sourcing context</h2><div className="mt-4 grid gap-3 text-sm"><p className="flex items-start gap-2"><CarFront className="mt-0.5 size-4 text-primary" aria-hidden="true" />{vehicle?.label ?? "No vehicle selected"}</p><p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 text-primary" aria-hidden="true" />{request.delivery_city}, {request.delivery_state}</p></div></div>
            <div className="rounded-xl border border-stone-200 bg-white p-5"><h2 className="font-body text-lg font-bold">Activity</h2><ol className="mt-4 grid gap-4">{events.map((event) => <li className="flex gap-3 text-sm" key={event.id}><CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><div><p className="font-semibold capitalize">{event.event_type.replaceAll("_", " ").toLowerCase()}</p><p className="mt-1 text-xs text-stone-500">{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))}</p></div></li>)}</ol></div>
          </aside>
        </div>
      </div>
    </section>
  );
}