"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { correctProductFitmentAction } from "@/app/(protected)/admin/fitment-actions";
import { Button } from "@/components/ui/button";
import type { FitmentEvidenceType } from "@/lib/supabase/database.types";

const initialState = { status: "idle" as const };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending} size="sm" type="submit">{pending ? "Saving…" : "Record correction"}</Button>;
}

export function FitmentCorrectionForm({
  evidence,
  fitmentId,
  isActive,
  productId,
}: {
  evidence: FitmentEvidenceType;
  fitmentId: string;
  isActive: boolean;
  productId: string;
}) {
  const [state, action] = useActionState(correctProductFitmentAction, initialState);
  return (
    <form action={action} className="mt-4 grid gap-3 rounded-md bg-stone-50 p-4">
      <input name="fitmentId" type="hidden" value={fitmentId} />
      <input name="productId" type="hidden" value={productId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-stone-700">Evidence
          <select className="mt-1 h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm" defaultValue={evidence} name="evidence">
            <option value="SELLER_CLAIMED">Seller claimed</option><option value="OEM_MATCHED">OEM matched</option><option value="PLATFORM_VERIFIED">Platform reviewed</option><option value="DISPUTED">Disputed</option><option value="KNOWN_INCORRECT">Known incorrect</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-stone-700">Marketplace matching
          <select className="mt-1 h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm" defaultValue={String(isActive)} name="isActive"><option value="true">Active</option><option value="false">Removed from matching</option></select>
        </label>
      </div>
      <label className="text-xs font-semibold text-stone-700">Evidence or correction reason
        <textarea className="mt-1 min-h-20 w-full rounded-md border border-stone-300 bg-white p-3 text-sm" maxLength={1000} minLength={10} name="reason" required />
      </label>
      {state.message ? <p aria-live="polite" className={`text-xs font-semibold ${state.status === "error" ? "text-primary" : "text-emerald-700"}`}>{state.message}</p> : null}
      <div><SubmitButton /></div>
    </form>
  );
}