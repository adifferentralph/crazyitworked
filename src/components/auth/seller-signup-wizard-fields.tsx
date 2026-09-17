"use client";

import Link from "next/link";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import type { AuthActionState } from "@/lib/auth/types";

const sectionClass = "grid gap-4 border-t border-stone-200 pt-5";
const headingClass = "text-xs font-bold uppercase tracking-[0.14em] text-stone-500";

export function SellerSignupWizardFields({ state }: { state: AuthActionState }) {
  return (
    <>
      <section className={sectionClass} aria-labelledby="seller-details-title">
        <h2 className={headingClass} id="seller-details-title">Your details</h2>
        <AuthField autoComplete="name" defaultValue={state.values?.fullName} errors={state.fieldErrors?.fullName} label="Full name" maxLength={100} minLength={2} name="fullName" placeholder="Your full name" required type="text" />
      </section>

      <section className={sectionClass} aria-labelledby="seller-store-title">
        <h2 className={headingClass} id="seller-store-title">Your store</h2>
        <AuthField autoComplete="organization" defaultValue={state.values?.storeName} errors={state.fieldErrors?.storeName} label="Store or business name" maxLength={120} minLength={2} name="storeName" placeholder="Your parts business" required type="text" />
      </section>

      <section className={sectionClass} aria-labelledby="seller-contact-title">
        <h2 className={headingClass} id="seller-contact-title">Contact</h2>
        <AuthField autoComplete="email" defaultValue={state.values?.email} errors={state.fieldErrors?.email} inputMode="email" label="Email" maxLength={254} name="email" placeholder="you@example.com" required type="email" />
      </section>

      <section className={sectionClass} aria-labelledby="seller-password-title">
        <h2 className={headingClass} id="seller-password-title">Password</h2>
        <AuthField autoComplete="new-password" errors={state.fieldErrors?.password} label="Create a password" maxLength={72} minLength={8} name="password" required type="password" />
        <AuthField autoComplete="new-password" errors={state.fieldErrors?.confirmPassword} label="Confirm password" maxLength={72} minLength={8} name="confirmPassword" required type="password" />
      </section>

      <section className={sectionClass} aria-labelledby="seller-agreement-title">
        <h2 className={headingClass} id="seller-agreement-title">Agreement</h2>
        <div>
          <div className="flex items-start gap-3 text-sm leading-6 text-stone-700">
            <input
              aria-describedby={state.fieldErrors?.terms?.[0] ? "seller-signup-terms-error" : undefined}
              aria-invalid={Boolean(state.fieldErrors?.terms?.[0])}
              className={`mt-1 size-4 rounded border-stone-300 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-primary ${state.fieldErrors?.terms?.[0] ? "ring-2 ring-primary ring-offset-2" : ""}`}
              defaultChecked={state.values?.terms === "on"}
              id="seller-signup-terms"
              name="terms"
              required
              type="checkbox"
            />
            <span>
              <label htmlFor="seller-signup-terms">I agree to the Terms of Use and acknowledge the </label>
              <Link className="font-semibold text-primary underline underline-offset-4" href="/privacy-policy" target="_blank">Privacy Policy</Link>.
            </span>
          </div>
          {state.fieldErrors?.terms?.[0] ? <p className="mt-2 text-sm font-medium text-primary" id="seller-signup-terms-error">{state.fieldErrors.terms[0]}</p> : null}
        </div>
      </section>

      <AuthAlert state={state} />
      <AuthSubmitButton label="Create seller account" pendingLabel="Creating account..." />
    </>
  );
}
