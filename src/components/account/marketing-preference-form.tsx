"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateBuyerMarketingAction } from "@/app/(protected)/account/actions";
import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import { initialBuyerActionState } from "@/lib/account/buyer-action-state";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      {pending ? "Saving..." : "Save preference"}
    </Button>
  );
}

export function MarketingPreferenceForm({
  marketingOptIn,
}: {
  marketingOptIn: boolean;
}) {
  const [state, action] = useActionState(
    updateBuyerMarketingAction,
    initialBuyerActionState,
  );

  return (
    <form action={action} className="grid gap-5">
      <label className="flex items-start gap-4 rounded-lg border border-stone-200 bg-white p-4">
        <input
          className="mt-1 size-5 accent-primary"
          defaultChecked={marketingOptIn}
          name="marketingOptIn"
          type="checkbox"
        />
        <span>
          <span className="font-bold text-stone-950">Marketplace updates</span>
          <span className="mt-1 block text-sm leading-6 text-stone-600">
            Receive optional product, category, and marketplace news. Order,
            account, and security emails are transactional and remain separate.
          </span>
        </span>
      </label>
      <AuthAlert state={state} />
      <div><SaveButton /></div>
    </form>
  );
}
