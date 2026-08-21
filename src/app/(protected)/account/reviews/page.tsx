import { CircleCheckBig } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";
import { FitmentFeedbackForm } from "@/components/account/fitment-feedback-form";
import { requireRole } from "@/lib/auth/principal";
import { getBuyerFitmentChecks } from "@/lib/fitment/data";

const outcomeLabels = {
  FIT_CONFIRMED: "You confirmed this part fit",
  FIT_PROBLEM_REPORTED: "You reported a fit problem",
  WRONG_PART: "You reported the wrong part",
  UNCONFIRMED: "You were not sure about fitment",
  NOT_APPLICABLE: "Fitment was not applicable",
} as const;

export default async function BuyerReviewsPage() {
  const principal = await requireRole(["BUYER"], "/account/reviews");
  const checks = await getBuyerFitmentChecks(principal.id);

  return (
    <AccountSectionPage
      description="Confirm whether fulfilled parts fit your vehicle. We keep this separate from seller claims and use only eligible purchase evidence."
      emptyDescription="There are no fulfilled purchases awaiting fitment feedback. We will ask here only when a real transaction becomes eligible."
      emptyTitle="No fitment checks yet"
      icon={CircleCheckBig}
      title="Reviews & Fitment"
    >
      {checks.length ? (
        <div className="grid gap-4">
          {checks.map((check) => (
            <article className="rounded-xl border border-stone-200 bg-white p-5" key={check.id}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{check.source === "RFQ_ACCEPTED_QUOTE" ? "Part request purchase" : "Marketplace purchase"}</p><h2 className="mt-1 text-xl font-semibold text-stone-950">{check.partName}</h2>{check.vehicleLabel ? <p className="mt-1 text-sm text-stone-600">Vehicle: {check.vehicleLabel}</p> : <p className="mt-1 text-sm text-stone-600">No vehicle snapshot was attached.</p>}</div>
                <time className="text-xs text-stone-500" dateTime={check.createdAt}>{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(check.createdAt))}</time>
              </div>
              {check.outcome ? <p className="mt-4 rounded-md bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-800">{outcomeLabels[check.outcome]}</p> : <FitmentFeedbackForm snapshotId={check.id} />}
            </article>
          ))}
        </div>
      ) : undefined}
    </AccountSectionPage>
  );
}