"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateBuyerProfileAction,
} from "@/app/(protected)/account/actions";
import { initialBuyerActionState } from "@/lib/account/buyer-action-state";
import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import type { BuyerAccountType } from "@/lib/supabase/database.types";

const accountTypes: { label: string; value: BuyerAccountType }[] = [
  { label: "Individual vehicle owner", value: "INDIVIDUAL" },
  { label: "Mechanic or technician", value: "MECHANIC_TECHNICIAN" },
  { label: "Garage or workshop", value: "GARAGE_WORKSHOP" },
  { label: "Fleet operator", value: "FLEET_OPERATOR" },
  { label: "Corporate buyer", value: "CORPORATE_BUYER" },
];

function SaveButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Saving..." : "Save profile"}</Button>;
}

export function BuyerProfileForm({
  accountType,
  businessRegistrationNumber,
  organizationName,
}: {
  accountType: BuyerAccountType;
  businessRegistrationNumber: string | null;
  organizationName: string | null;
}) {
  const [state, action] = useActionState(updateBuyerProfileAction, initialBuyerActionState);

  return (
    <form action={action} className="grid gap-5" noValidate>
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-stone-800" htmlFor="profile-account-type">
          Account type
        </label>
        <select
          aria-invalid={Boolean(state.fieldErrors?.accountType?.[0])}
          className="h-12 rounded-md border border-stone-300 bg-white px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          defaultValue={accountType}
          id="profile-account-type"
          name="accountType"
        >
          {accountTypes.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-stone-800" htmlFor="organizationName">
          Business or organisation name
        </label>
        <input
          aria-invalid={Boolean(state.fieldErrors?.organizationName?.[0])}
          className="h-12 rounded-md border border-stone-300 px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          defaultValue={organizationName ?? ""}
          id="organizationName"
          maxLength={120}
          name="organizationName"
        />
        <p className="text-xs text-stone-500">Required for garages, fleets, and corporate buyer accounts.</p>
        {state.fieldErrors?.organizationName?.[0] ? <p className="text-sm font-medium text-primary">{state.fieldErrors.organizationName[0]}</p> : null}
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-semibold text-stone-800" htmlFor="businessRegistrationNumber">
          Business registration number (optional)
        </label>
        <input
          aria-invalid={Boolean(state.fieldErrors?.businessRegistrationNumber?.[0])}
          className="h-12 rounded-md border border-stone-300 px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          defaultValue={businessRegistrationNumber ?? ""}
          id="businessRegistrationNumber"
          maxLength={100}
          name="businessRegistrationNumber"
        />
        {state.fieldErrors?.businessRegistrationNumber?.[0] ? <p className="text-sm font-medium text-primary">{state.fieldErrors.businessRegistrationNumber[0]}</p> : null}
      </div>
      <AuthAlert state={state} />
      <div><SaveButton /></div>
    </form>
  );
}