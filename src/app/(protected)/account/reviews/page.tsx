import { CircleCheckBig } from "lucide-react";

import { submitProductReviewAction } from "@/app/(protected)/account/reviews/actions";
import { AccountSectionPage } from "@/components/account/account-section-page";
import { FitmentFeedbackForm } from "@/components/account/fitment-feedback-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/lib/auth/principal";
import { getBuyerFitmentChecks } from "@/lib/fitment/data";
import { getBuyerReviewOpportunities } from "@/lib/reviews/data";

const outcomeLabels = {
  FIT_CONFIRMED: "You confirmed this part fit",
  FIT_PROBLEM_REPORTED: "You reported a fit problem",
  WRONG_PART: "You reported the wrong part",
  UNCONFIRMED: "You were not sure about fitment",
  NOT_APPLICABLE: "Fitment was not applicable",
} as const;

export default async function BuyerReviewsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const principal = await requireRole(["BUYER"], "/account/reviews");
  const [checks, opportunities, query] = await Promise.all([
    getBuyerFitmentChecks(principal.id),
    getBuyerReviewOpportunities(principal.id),
    searchParams,
  ]);
  const pendingReviews = opportunities.filter((item) => !item.existing_review_id);

  return (
    <AccountSectionPage
      description="Confirm whether fulfilled parts fit your vehicle. We keep this separate from seller claims and use only eligible purchase evidence."
      emptyDescription="There are no fulfilled purchases awaiting fitment feedback. We will ask here only when a real transaction becomes eligible."
      emptyTitle="No fitment checks yet"
      icon={CircleCheckBig}
      title="Reviews & Fitment"
    >
      {query.message ? <p className="mb-5 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900" role="status">{query.message}</p> : null}
      {query.error ? <p className="mb-5 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-900" role="alert">{query.error}</p> : null}
      {pendingReviews.length ? <section className="mb-7"><h2 className="text-xl font-bold text-stone-950">Products you can review</h2><div className="mt-4 grid gap-4">{pendingReviews.map((item) => <article className="rounded-xl border border-stone-200 bg-white p-5" key={item.order_item_id}><h3 className="text-lg font-bold text-stone-950">{item.product_name}</h3><form action={submitProductReviewAction} className="mt-4 grid gap-3 sm:grid-cols-2"><input name="orderItemId" type="hidden" value={item.order_item_id} /><div><label className="mb-2 block text-sm font-semibold" htmlFor={`rating-${item.order_item_id}`}>Rating</label><select className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm" id={`rating-${item.order_item_id}`} name="rating" required><option value="">Choose</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} out of 5</option>)}</select></div><div><label className="mb-2 block text-sm font-semibold" htmlFor={`name-${item.order_item_id}`}>Public name</label><Input defaultValue={principal.fullName} id={`name-${item.order_item_id}`} name="reviewerName" required /></div><div className="sm:col-span-2"><label className="mb-2 block text-sm font-semibold" htmlFor={`title-${item.order_item_id}`}>Review title <span className="font-normal text-stone-500">— Optional</span></label><Input id={`title-${item.order_item_id}`} name="title" /></div><div className="sm:col-span-2"><label className="mb-2 block text-sm font-semibold" htmlFor={`body-${item.order_item_id}`}>Your review <span className="font-normal text-stone-500">— Optional</span></label><textarea className="min-h-24 w-full rounded-md border border-stone-300 p-3 text-sm" id={`body-${item.order_item_id}`} maxLength={2000} name="body" /></div><Button className="sm:col-span-2" type="submit">Publish review</Button></form></article>)}</div></section> : null}
      {checks.length ? (
        <section className="grid gap-4"><h2 className="text-xl font-bold text-stone-950">Fitment feedback</h2>
          {checks.map((check) => (
            <article className="rounded-xl border border-stone-200 bg-white p-5" key={check.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{check.source === "RFQ_ACCEPTED_QUOTE" ? "Part request purchase" : "Marketplace purchase"}</p><h2 className="mt-1 text-xl font-semibold text-stone-950">{check.partName}</h2>{check.vehicleLabel ? <p className="mt-1 text-sm text-stone-600">Vehicle: {check.vehicleLabel}</p> : <p className="mt-1 text-sm text-stone-600">No vehicle snapshot was attached.</p>}</div>
                <time className="text-xs text-stone-500" dateTime={check.createdAt}>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(check.createdAt))}</time>
              </div>
              {check.outcome ? <p className="mt-4 rounded-md bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-800">{outcomeLabels[check.outcome]}</p> : <FitmentFeedbackForm snapshotId={check.id} />}
            </article>
          ))}
        </section>
      ) : pendingReviews.length ? null : undefined}
    </AccountSectionPage>
  );
}
