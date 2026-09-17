"use client";

import { useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Button } from "@/components/ui/button";
import type { AuthActionState } from "@/lib/auth/types";

const stepByField: Record<string, number> = {
  accountType: 1,
  firstName: 1,
  lastName: 1,
  organizationName: 1,
  email: 2,
  phone: 2,
  confirmPassword: 3,
  password: 3,
  marketingOptIn: 4,
  terms: 4,
};

function getErrorStep(fieldErrors: AuthActionState["fieldErrors"]) {
  if (!fieldErrors) return 1;

  for (const field of Object.keys(fieldErrors)) {
    if (fieldErrors[field]?.length && stepByField[field]) return stepByField[field];
  }

  return 4;
}

function getFormControl(form: HTMLFormElement, name: string) {
  const control = form.elements.namedItem(name);
  return control instanceof HTMLInputElement || control instanceof HTMLSelectElement
    ? control
    : null;
}

function validateStep(form: HTMLFormElement, step: number) {
  const fieldNames =
    step === 1
      ? ["firstName", "lastName", "accountType", "organizationName"]
      : step === 2
        ? ["email", "phone"]
        : ["password", "confirmPassword"];

  for (const name of fieldNames) {
    getFormControl(form, name)?.setCustomValidity("");
  }

  if (step === 1) {
    const accountType = getFormControl(form, "accountType");
    const organizationName = getFormControl(form, "organizationName");
    const requiresOrganization = ["GARAGE_WORKSHOP", "FLEET_OPERATOR", "CORPORATE_BUYER"].includes(
      accountType?.value ?? "",
    );

    if (requiresOrganization && !organizationName?.value.trim()) {
      organizationName?.setCustomValidity("Enter your business or organisation name.");
    }
  }

  if (step === 3) {
    const password = getFormControl(form, "password");
    const confirmation = getFormControl(form, "confirmPassword");
    if (password && confirmation && password.value !== confirmation.value) {
      confirmation.setCustomValidity("Passwords do not match.");
    }
  }

  for (const name of fieldNames) {
    const control = getFormControl(form, name);
    if (control && !control.checkValidity()) {
      control.reportValidity();
      control.focus();
      return false;
    }
  }

  return true;
}

export function BuyerSignupWizardFields({ state }: { state: AuthActionState }) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (state.status !== "error") return;

    const errorStep = getErrorStep(state.fieldErrors);
    setStep(errorStep);
    window.setTimeout(() => {
      document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus();
    }, 0);
  }, [state]);

  function continueToNextStep(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form || !validateStep(form, step)) return;
    setStep((current) => Math.min(current + 1, 4));
  }

  return (
    <>
      <div aria-live="polite" className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
          <span>Step {step} of 4</span>
          <span>
            {step === 1 ? "About you" : step === 2 ? "Contact" : step === 3 ? "Password" : "Review"}
          </span>
        </div>
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${step * 25}%` }}
          />
        </div>
      </div>

      <fieldset className="grid gap-4 sm:gap-5" hidden={step !== 1}>
        <legend className="sr-only">About you</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField
            autoComplete="given-name"
            defaultValue={state.values?.firstName}
            errors={state.fieldErrors?.firstName}
            label="First name"
            maxLength={50}
            minLength={1}
            name="firstName"
            placeholder="First name"
            required
            type="text"
          />
          <AuthField
            autoComplete="family-name"
            defaultValue={state.values?.lastName}
            errors={state.fieldErrors?.lastName}
            label="Last name"
            maxLength={50}
            minLength={1}
            name="lastName"
            placeholder="Last name"
            required
            type="text"
          />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-stone-800" htmlFor="buyer-account-type">
            How will you use Twenty-Two Parts?
          </label>
          <select
            aria-describedby={
              state.fieldErrors?.accountType?.[0] ? "buyer-account-type-error" : undefined
            }
            aria-invalid={Boolean(state.fieldErrors?.accountType?.[0])}
            className={`h-12 w-full rounded-md border bg-white px-3.5 text-base text-stone-950 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${
              state.fieldErrors?.accountType?.[0]
                ? "border-primary bg-red-50 ring-2 ring-primary/20"
                : "border-stone-300"
            }`}
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
          {state.fieldErrors?.accountType?.[0] ? (
            <p className="text-sm font-medium text-primary" id="buyer-account-type-error">
              {state.fieldErrors.accountType[0]}
            </p>
          ) : null}
        </div>
        <AuthField
          autoComplete="organization"
          defaultValue={state.values?.organizationName}
          errors={state.fieldErrors?.organizationName}
          label="Business or organisation name"
          maxLength={120}
          name="organizationName"
          placeholder="Your workshop, fleet, or company"
          type="text"
        />
        <p className="-mt-2 text-xs leading-5 text-stone-500">
          Required for garages, fleets, and companies. Optional for individuals and mechanics.
        </p>
      </fieldset>

      <fieldset className="grid gap-4 sm:gap-5" hidden={step !== 2}>
        <legend className="sr-only">Contact details</legend>
        <AuthField
          autoComplete="email"
          defaultValue={state.values?.email}
          errors={state.fieldErrors?.email}
          inputMode="email"
          label="Email address"
          maxLength={254}
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
        <AuthField
          autoComplete="tel"
          defaultValue={state.values?.phone}
          errors={state.fieldErrors?.phone}
          inputMode="tel"
          label="Phone number — Optional"
          maxLength={30}
          name="phone"
          placeholder="+234 800 000 0000"
          type="tel"
        />
      </fieldset>

      <fieldset className="grid gap-4 sm:gap-5" hidden={step !== 3}>
        <legend className="sr-only">Choose a password</legend>
        <AuthField
          autoComplete="new-password"
          errors={state.fieldErrors?.password}
          label="Password"
          maxLength={72}
          minLength={8}
          name="password"
          required
          type="password"
        />
        <AuthField
          autoComplete="new-password"
          errors={state.fieldErrors?.confirmPassword}
          label="Confirm password"
          maxLength={72}
          minLength={8}
          name="confirmPassword"
          required
          type="password"
        />
      </fieldset>

      <fieldset className="grid gap-4 sm:gap-5" hidden={step !== 4}>
        <legend className="sr-only">Terms and preferences</legend>
        <div>
          <div className="flex items-start gap-3 text-sm leading-6 text-stone-700">
            <input
              aria-describedby={
                state.fieldErrors?.terms?.[0] ? "buyer-signup-terms-error" : undefined
              }
              aria-invalid={Boolean(state.fieldErrors?.terms?.[0])}
              className={`mt-1 size-4 rounded border-stone-300 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                state.fieldErrors?.terms?.[0] ? "ring-2 ring-primary ring-offset-2" : ""
              }`}
              defaultChecked={state.values?.terms === "on"}
              id="buyer-signup-terms"
              name="terms"
              required
              type="checkbox"
            />
            <span>
              <label htmlFor="buyer-signup-terms">
                I agree to the Terms of Use and acknowledge the{" "}
              </label>
              <a
                className="font-semibold text-primary underline underline-offset-4"
                href="/privacy-policy"
                rel="noopener noreferrer"
                target="_blank"
              >
                Privacy Policy
              </a>
              .
            </span>
          </div>
          {state.fieldErrors?.terms?.[0] ? (
            <p className="mt-2 text-sm font-medium text-primary" id="buyer-signup-terms-error">
              {state.fieldErrors.terms[0]}
            </p>
          ) : null}
        </div>
        <label className="flex items-start gap-3 text-sm leading-6 text-stone-700">
          <input
            className="mt-1 size-4 rounded border-stone-300 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
            defaultChecked={state.values?.marketingOptIn === "on"}
            name="marketingOptIn"
            type="checkbox"
          />
          Optional — email me useful product updates and marketplace offers. You can unsubscribe at
          any time.
        </label>
      </fieldset>

      <AuthAlert state={state} />

      <div className="grid grid-cols-2 gap-3">
        {step > 1 ? (
          <Button
            onClick={() => setStep((current) => Math.max(current - 1, 1))}
            type="button"
            variant="outline"
          >
            Back
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
        {step < 4 ? (
          <Button onClick={continueToNextStep} type="button">
            Continue
          </Button>
        ) : (
          <AuthSubmitButton label="Create buyer account" pendingLabel="Creating account…" />
        )}
      </div>
    </>
  );
}
