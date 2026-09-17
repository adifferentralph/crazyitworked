"use client";

import Link from "next/link";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import type { AuthActionState } from "@/lib/auth/types";

const sectionClass = "grid gap-4 border-t border-stone-200 pt-5";
const headingClass = "text-xs font-bold uppercase tracking-[0.14em] text-stone-500";

export function BuyerSignupWizardFields({ state }: { state: AuthActionState }) {
  return (
    <>
      <section className={sectionClass} aria-labelledby="buyer-details-title">
        <h2 className={headingClass} id="buyer-details-title">Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField autoComplete="given-name" defaultValue={state.values?.firstName} errors={state.fieldErrors?.firstName} label="First name" maxLength={50} minLength={1} name="firstName" placeholder="First name" required type="text" />
          <AuthField autoComplete="family-name" defaultValue={state.values?.lastName} errors={state.fieldErrors?.lastName} label="Last name" maxLength={50} minLength={1} name="lastName" placeholder="Last name" required type="text" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-stone-800" htmlFor="buyer-account-type">
            How will you use Twenty-Two Parts?
          </label>
          <select
            aria-describedby={state.fieldErrors?.accountType?.[0] ? "buyer-account-type-error" : undefined}
            aria-invalid={Boolean(state.fieldErrors?.accountType?.[0])}
            className={`h-12 w-full rounded-md border bg-white px-3.5 text-base text-stone-950 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${state.fieldErrors?.accountType?.[0] ? "border-primary bg-red-50" : "border-stone-300"}`}
            defaultValue={state.values?.accountType ?? "INDIVIDUAL"}
            id="buyer-account-type"
            name="accountType"
          >
            <option value="INDIVIDUAL">Individual vehicle owner</option>
            <option value="MECHANIC_TECHNICIAN">Mechanic or technician</option>
            <option value="GARAGE_WORKSHOP">Garage or workshop</option>
            <option value="FLEET_OPERATOR">Fleet operator</option>
            <option value="CORPORATE_BUYER">Corporate buyer</option>
          </select>
          {state.fieldErrors?.accountType?.[0] ? <p className="text-sm font-medium text-primary" id="buyer-account-type-error">{state.fieldErrors.accountType[0]}</p> : null}
        </div>
        <AuthField autoComplete="organization" defaultValue={state.values?.organizationName} errors={state.fieldErrors?.organizationName} label="Business or organisation name" maxLength={120} name="organizationName" placeholder="Your workshop, fleet, or company" type="text" />
        <p className="-mt-2 text-xs leading-5 text-stone-500">
          Optional for individuals and mechanics. Required only when you choose a garage, fleet, or company account.
        </p>
      </section>

      <section className={sectionClass} aria-labelledby="buyer-contact-title">
        <h2 className={headingClass} id="buyer-contact-title">Contact</h2>
        <AuthField autoComplete="email" defaultValue={state.values?.email} errors={state.fieldErrors?.email} inputMode="email" label="Email" maxLength={254} name="email" placeholder="you@example.com" required type="email" />
        <AuthField autoComplete="tel" defaultValue={state.values?.phone} errors={state.fieldErrors?.phone} inputMode="tel" label="Phone number — Optional" maxLength={30} name="phone" placeholder="+234 800 000 0000" type="tel" />
      </section>

      <section className={sectionClass} aria-labelledby="buyer-password-title">
        <h2 className={headingClass} id="buyer-password-title">Password</h2>
        <AuthField autoComplete="new-password" errors={state.fieldErrors?.password} label="Create a password" maxLength={72} minLength={8} name="password" required type="password" />
        <AuthField autoComplete="new-password" errors={state.fieldErrors?.confirmPassword} label="Confirm password" maxLength={72} minLength={8} name="confirmPassword" required type="password" />
      </section>

      <section className={sectionClass} aria-labelledby="buyer-agreement-title">
        <h2 className={headingClass} id="buyer-agreement-title">Agreement</h2>
        <div>
          <div className="flex items-start gap-3 text-sm leading-6 text-stone-700">
            <input
              aria-describedby={state.fieldErrors?.terms?.[0] ? "buyer-signup-terms-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.terms?.[0])}
              className={`mt-1 size-4 rounded border-stone-300 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-primary ${state.fieldErrors?.terms?.[0] ? "ring-2 ring-primary ring-offset-2" : ""}`}
              defaultChecked={state.values?.terms === "on"}
              id="buyer-signup-terms"
              name="terms"
              required
              type="checkbox"
            />
            <span>
              <label htmlFor="buyer-signup-terms">I agree to the Terms of Use and acknowledge the </label>
              <Link className="font-semibold text-primary underline underline-offset-4" href="/privacy-policy" target="_blank">Privacy Policy</Link>.
            </span>
          </div>
          {state.fieldErrors?.terms?.[0] ? <p className="mt-2 text-sm font-medium text-primary" id="buyer-signup-terms-error">{state.fieldErrors.terms[0]}</p> : null}
        </div>
        <label className="flex items-start gap-3 text-sm leading-6 text-stone-700">
          <input className="mt-1 size-4 rounded border-stone-300 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-primary" defaultChecked={state.values?.marketingOptIn === "on"} name="marketingOptIn" type="checkbox" />
          Email me product updates and offers. Optional — you can change this later.
        </label>
      </section>

      <AuthAlert state={state} />
      <AuthSubmitButton label="Create buyer account" pendingLabel="Creating account..." />
    </>
  );
}
