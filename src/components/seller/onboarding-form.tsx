"use client";

import { useActionState } from "react";

import {
  completeSellerOnboardingAction,
} from "@/app/(protected)/seller/actions";
import { SellerFormAlert } from "@/components/seller/seller-form-alert";
import { initialSellerActionState } from "@/lib/marketplace/seller-action-state";
import { SellerSubmitButton } from "@/components/seller/seller-submit-button";
import { Input } from "@/components/ui/input";

type OnboardingDefaults = {
  businessRegistrationNumber: string | null;
  city: string | null;
  contactPhone: string | null;
  description: string | null;
  state: string | null;
  storeName: string;
  websiteUrl: string | null;
};

const labelClass = "mb-2 block text-sm font-semibold text-stone-800";
const textareaClass = "min-h-32 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-ring";

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <p className="mt-2 text-sm text-primary">{errors[0]}</p> : null;
}

export function OnboardingForm({ defaults }: { defaults: OnboardingDefaults }) {
  const [state, formAction] = useActionState(completeSellerOnboardingAction, initialSellerActionState);

  return (
    <form action={formAction} className="grid gap-7" noValidate>
      <div className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
        <div className="sm:col-span-2">
          <h2 className="text-2xl font-semibold text-stone-950">Business profile</h2>
          <p className="mt-2 text-sm text-stone-600">This information helps the marketplace team verify your parts business.</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="storeName">Store or business name</label>
          <Input autoComplete="organization" defaultValue={defaults.storeName} id="storeName" name="storeName" />
          <FieldError errors={state.fieldErrors?.storeName} />
        </div>
        <div>
          <label className={labelClass} htmlFor="businessRegistrationNumber">Registration number</label>
          <Input defaultValue={defaults.businessRegistrationNumber ?? ""} id="businessRegistrationNumber" name="businessRegistrationNumber" placeholder="CAC or business registration number" />
          <FieldError errors={state.fieldErrors?.businessRegistrationNumber} />
        </div>
        <div>
          <label className={labelClass} htmlFor="contactPhone">Business phone</label>
          <Input autoComplete="tel" defaultValue={defaults.contactPhone ?? ""} id="contactPhone" inputMode="tel" name="contactPhone" placeholder="+234 800 000 0000" />
          <FieldError errors={state.fieldErrors?.contactPhone} />
        </div>
        <div>
          <label className={labelClass} htmlFor="websiteUrl">Website <span className="font-normal text-stone-500">(optional)</span></label>
          <Input autoComplete="url" defaultValue={defaults.websiteUrl ?? ""} id="websiteUrl" inputMode="url" name="websiteUrl" placeholder="https://example.com" type="url" />
          <FieldError errors={state.fieldErrors?.websiteUrl} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="description">About your business</label>
          <textarea className={textareaClass} defaultValue={defaults.description ?? ""} id="description" name="description" placeholder="Tell buyers what you specialise in, how long you have traded, and how you source parts." />
          <FieldError errors={state.fieldErrors?.description} />
        </div>
      </div>

      <div className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
        <div className="sm:col-span-2">
          <h2 className="text-2xl font-semibold text-stone-950">Operating location</h2>
          <p className="mt-2 text-sm text-stone-600">Use the primary location from which you fulfil orders.</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="country">Country</label>
          <Input defaultValue="Nigeria" id="country" name="country" readOnly />
        </div>
        <div>
          <label className={labelClass} htmlFor="state">State</label>
          <Input autoComplete="address-level1" defaultValue={defaults.state ?? ""} id="state" name="state" placeholder="Lagos" />
          <FieldError errors={state.fieldErrors?.state} />
        </div>
        <div>
          <label className={labelClass} htmlFor="city">City</label>
          <Input autoComplete="address-level2" defaultValue={defaults.city ?? ""} id="city" name="city" placeholder="Ikeja" />
          <FieldError errors={state.fieldErrors?.city} />
        </div>
      </div>

      <SellerFormAlert state={state} />
      <div>
        <SellerSubmitButton pendingLabel="Saving supplier profile…" type="submit">Save and submit for verification</SellerSubmitButton>
      </div>
    </form>
  );
}
