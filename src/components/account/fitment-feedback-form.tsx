"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck, CircleHelp, CircleX } from "lucide-react";

import { submitFitmentOutcomeAction } from "@/app/(protected)/account/actions";
import { Button } from "@/components/ui/button";
import type { BuyerActionState } from "@/lib/account/buyer-action-state";

const initialState: BuyerActionState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? "Saving feedback…" : "Save fitment feedback"}</Button>;
}

const choices = [
  { icon: CircleCheck, label: "Yes, it fit", value: "FIT_CONFIRMED" },
  { icon: CircleX, label: "No, there was a fit problem", value: "FIT_PROBLEM_REPORTED" },
  { icon: CircleHelp, label: "I’m not sure", value: "UNCONFIRMED" },
] as const;

export function FitmentFeedbackForm({ snapshotId }: { snapshotId: string }) {
  const [state, action] = useActionState(submitFitmentOutcomeAction, initialState);
  return (
    <form action={action} className="mt-4 border-t border-stone-200 pt-4">
      <input name="snapshotId" type="hidden" value={snapshotId} />
      <fieldset>
        <legend className="text-sm font-semibold text-stone-950">Did this part fit the vehicle?</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {choices.map(({ icon: Icon, label, value }) => (
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-stone-200 bg-white p-3 text-sm font-semibold has-[:checked]:border-primary has-[:checked]:bg-orange-50" key={value}>
              <input className="accent-primary" name="outcome" required type="radio" value={value} />
              <Icon aria-hidden="true" className="size-4 text-primary" />{label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block text-sm font-semibold" htmlFor={`fitment-note-${snapshotId}`}>Optional note</label>
      <textarea className="mt-2 min-h-24 w-full rounded-md border border-stone-300 bg-white p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" id={`fitment-note-${snapshotId}`} maxLength={1000} name="note" placeholder="Share the fitment issue or what matched." />
      {state.message ? <p aria-live="polite" className={`mt-3 text-sm font-semibold ${state.status === "error" ? "text-primary" : "text-emerald-700"}`}>{state.message}</p> : null}
      <div className="mt-4"><SubmitButton /></div>
    </form>
  );
}