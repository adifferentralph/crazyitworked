"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Button } from "@/components/ui/button";
import type { AuthActionState } from "@/lib/auth/types";

const stepByField: Record<string, number> = {
  fullName: 1,
  storeName: 2,
  email: 3,
  confirmPassword: 4,
  password: 4,
  terms: 4,
};

function getFormControl(form: HTMLFormElement, name: string) {
  const control = form.elements.namedItem(name);
  return control instanceof HTMLInputElement ? control : null;
}

function getErrorStep(fieldErrors: AuthActionState["fieldErrors"]) {
  if (!fieldErrors) return 1;

  for (const field of Object.keys(fieldErrors)) {
    if (fieldErrors[field]?.length && stepByField[field]) return stepByField[field];
  }

  return 4;
}

function validateStep(form: HTMLFormElement, step: number) {
  const fieldNames =
    step === 1
      ? ["fullName"]
      : step === 2
        ? ["storeName"]
        : step === 3
          ? ["email"]
          : ["password", "confirmPassword", "terms"];

  for (const name of fieldNames) getFormControl(form, name)?.setCustomValidity("");

  if (step === 4) {
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

export function SellerSignupWizardFields({ state }: { state: AuthActionState }) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (state.status !== "error") return;

    setStep(getErrorStep(state.fieldErrors));
    window.setTimeout(() => {
      document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus();
    }, 0);
  }, [state]);

  function continueToNextStep(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form || !validateStep(form, step)) return;
    setStep((current) => Math.min(current + 1, 4));
  }

  function validateFinalStep(event: React.MouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof HTMLButtonElement)) return;
    const form = event.target.form;
    if (!form || validateStep(form, 4)) return;
    event.preventDefault();
  }

  return (
    <>
      <div aria-live="polite" className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
          <span>Step {step} of 4</span>
          <span>
            {step === 1
              ? "Your details"
              : step === 2
                ? "Your store"
                : step === 3
                  ? "Contact"
                  : "Password"}
          </span>
        </div>
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${step * 25}%` }}
          />
        </div>
      </div>

      <fieldset className="grid gap-4" hidden={step !== 1}>
        <legend className="sr-only">Your details</legend>
        <AuthField
          autoComplete="name"
          defaultValue={state.values?.fullName}
          errors={state.fieldErrors?.fullName}
          label="Full name"
          maxLength={100}
          minLength={2}
          name="fullName"
          placeholder="Your full name"
          required
          type="text"
        />
      </fieldset>

      <fieldset className="grid gap-4" hidden={step !== 2}>
        <legend className="sr-only">Your store</legend>
        <AuthField
          autoComplete="organization"
          defaultValue={state.values?.storeName}
          errors={state.fieldErrors?.storeName}
          label="Store or business name"
          maxLength={120}
          minLength={2}
          name="storeName"
          placeholder="Your parts business"
          required
          type="text"
        />
      </fieldset>

      <fieldset className="grid gap-4" hidden={step !== 3}>
        <legend className="sr-only">Contact</legend>
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
      </fieldset>

      <fieldset className="grid gap-4" hidden={step !== 4}>
        <legend className="sr-only">Create your password</legend>
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
        <div>
          <div className="flex items-start gap-3 text-sm leading-6 text-stone-700">
            <input
              aria-describedby={
                state.fieldErrors?.terms?.[0] ? "seller-signup-terms-error" : undefined
              }
              aria-invalid={Boolean(state.fieldErrors?.terms?.[0])}
              className={`mt-1 size-4 rounded border-stone-300 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-primary ${state.fieldErrors?.terms?.[0] ? "ring-2 ring-primary ring-offset-2" : ""}`}
              defaultChecked={state.values?.terms === "on"}
              id="seller-signup-terms"
              name="terms"
              required
              type="checkbox"
            />
            <span>
              <label htmlFor="seller-signup-terms">
                I agree to the Terms of Use and acknowledge the{" "}
              </label>
              <Link
                className="font-semibold text-primary underline underline-offset-4"
                href="/privacy-policy"
                rel="noopener noreferrer"
                target="_blank"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </div>
          {state.fieldErrors?.terms?.[0] ? (
            <p className="mt-2 text-sm font-medium text-primary" id="seller-signup-terms-error">
              {state.fieldErrors.terms[0]}
            </p>
          ) : null}
        </div>
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
          <div onClickCapture={validateFinalStep}>
            <AuthSubmitButton label="Create seller account" pendingLabel="Creating account..." />
          </div>
        )}
      </div>
    </>
  );
}
