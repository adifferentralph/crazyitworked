import Link from "next/link";
import { ArrowRight, FileQuestion, Plus } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { formatNgn } from "@/lib/marketplace/products";
import { getBuyerPartRequests } from "@/lib/rfq/data";

const statusStyle: Record<string, string> = {
  ACCEPTED: "bg-emerald-50 text-emerald-800",
  CANCELLED: "bg-stone-100 text-stone-600",
  CLOSED: "bg-stone-100 text-stone-700",
  DRAFT: "bg-orange-50 text-orange-800",
  EXPIRED: "bg-stone-100 text-stone-600",
  OPEN: "bg-blue-50 text-blue-800",
  QUOTED: "bg-violet-50 text-violet-800",
};

export default async function BuyerRequestsPage() {
  const principal = await requireRole(["BUYER"], "/account/requests");
  const requests = await getBuyerPartRequests(principal.id);

  return (
    <AccountSectionPage description="Send one clear request to matched verified suppliers and compare real quotes." icon={FileQuestion} title="Part Requests">
      <div className="mb-5 flex justify-end"><Button asChild><Link href="/account/requests/new"><Plus className="size-4" aria-hidden="true" />New request</Link></Button></div>
      {requests.length ? <div className="grid gap-3">{requests.map((request) => (
        <article className="rounded-xl border border-stone-200 bg-white p-5" key={request.id}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[request.status]}`}>{request.status.replaceAll("_", " ").toLowerCase()}</span><span className="text-xs text-stone-500">{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(request.created_at))}</span></div>
              <h2 className="mt-3 font-body text-xl font-bold text-stone-950">{request.part_name}</h2>
              <p className="mt-2 text-sm text-stone-600">Quantity {request.quantity} · Delivery to {request.delivery_city}, {request.delivery_state}</p>
              {request.budget_max_minor ? <p className="mt-2 text-sm font-semibold text-stone-800">Budget up to {formatNgn(request.budget_max_minor)}</p> : null}
              <p className="mt-3 text-sm font-semibold text-primary">{request.quoteCount} {request.quoteCount === 1 ? "quote" : "quotes"}</p>
            </div>
            <Button asChild size="sm" variant="outline"><Link href={`/account/requests/${request.id}`}>View request<ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
          </div>
        </article>
      ))}</div> : <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center"><FileQuestion className="mx-auto size-9 text-stone-300" aria-hidden="true" /><h2 className="mt-4 font-body text-xl font-bold text-stone-950">No part requests yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">When catalogue search does not find the right item, send the details to matched suppliers.</p><Button asChild className="mt-5"><Link href="/account/requests/new">Request a part</Link></Button></div>}
    </AccountSectionPage>
  );
}