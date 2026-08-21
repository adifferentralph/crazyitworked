import Link from "next/link";
import { ArrowRight, FileQuestion } from "lucide-react";

import { SellerShell } from "@/components/seller/seller-shell";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { getSellerMatchedRequests } from "@/lib/rfq/data";

export default async function SellerRequestsPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  const principal = await requireRole(["SELLER"], "/seller/requests");
  const [matches, query] = await Promise.all([getSellerMatchedRequests(principal.id), searchParams]);

  return (
    <SellerShell description="Review part demand matched to your verified business categories and respond with a real quote." title="Part Requests">
      {query.request === "declined" ? <p className="mb-5 rounded-md border border-stone-200 bg-white p-3 text-sm font-semibold" role="status">Request declined and removed from your active work.</p> : null}
      {matches.length ? <div className="grid gap-3">{matches.map((match) => (
        <article className="rounded-xl border border-stone-200 bg-white p-5" key={match.id}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold capitalize text-stone-700">{match.status.toLowerCase()}</span>{match.category_matched ? <span className="text-xs font-semibold text-emerald-700">Category match</span> : null}{match.location_matched ? <span className="text-xs font-semibold text-blue-700">Location match</span> : null}</div><h2 className="mt-3 font-body text-xl font-bold text-stone-950">{match.request.part_name}</h2><p className="mt-2 text-sm text-stone-600">Quantity {match.request.quantity} · {match.request.delivery_city}, {match.request.delivery_state}</p><p className="mt-2 text-xs text-stone-500">Buyer request status: {match.request.status.replaceAll("_", " ").toLowerCase()}</p>{match.quoteStatus ? <p className="mt-3 text-sm font-semibold text-primary">Your quote: {match.quoteStatus.toLowerCase()}</p> : null}</div>
            <Button asChild size="sm" variant="outline"><Link href={`/seller/requests/${match.request.id}`}>Review request<ArrowRight className="size-4" aria-hidden="true" /></Link></Button>
          </div>
        </article>
      ))}</div> : <div className="rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center"><FileQuestion className="mx-auto size-9 text-stone-300" aria-hidden="true" /><h2 className="mt-4 font-body text-xl font-bold text-stone-950">No matched requests</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">Open buyer requests appear here only when your business is active, verified, and matched to a selected category.</p><Button asChild className="mt-5" variant="outline"><Link href="/seller/onboarding">Review store categories</Link></Button></div>}
    </SellerShell>
  );
}