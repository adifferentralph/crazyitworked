"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";

import { completeSellerOnboardingAction } from "@/app/(protected)/seller/actions";
import { SellerFormAlert } from "@/components/seller/seller-form-alert";
import { SellerSubmitButton } from "@/components/seller/seller-submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initialSellerActionState } from "@/lib/marketplace/seller-action-state";

type OnboardingDefaults = {
  businessRegistrationNumber: string | null;
  categoryIds: string[];
  city: string | null;
  contactPhone: string | null;
  description: string | null;
  state: string | null;
  storeName: string;
  websiteUrl: string | null;
};

const labelClass = "mb-2 block text-sm font-semibold text-stone-800";
const textareaClass =
  "min-h-32 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-ring";
const steps = ["Your details", "Your store", "What you sell", "Your location", "Finish"] as const;

const errorStepByField: Record<string, number> = {
  contactPhone: 1,
  businessRegistrationNumber: 2,
  description: 2,
  storeName: 2,
  websiteUrl: 2,
  categoryIds: 3,
  city: 4,
  country: 4,
  state: 4,
};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <p className="mt-2 text-sm text-primary">{errors[0]}</p> : null;
}

function getFormControl(form: HTMLFormElement, name: string) {
  const control = form.elements.namedItem(name);
  return control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement
    ? control
    : null;
}

function firstErrorStep(fieldErrors: Record<string, string[] | undefined> | undefined) {
  if (!fieldErrors) return 1;

  for (const field of Object.keys(fieldErrors)) {
    if (fieldErrors[field]?.length && errorStepByField[field]) return errorStepByField[field];
  }

  return 5;
}

export function OnboardingForm({
  categories,
  defaults,
}: {
  categories: { id: string; label: string }[];
  defaults: OnboardingDefaults;
}) {
  const [state, formAction] = useActionState(
    completeSellerOnboardingAction,
    initialSellerActionState,
  );
  const [step, setStep] = useState(1);
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(
    () => new Set(defaults.categoryIds),
  );
  const selectAllRef = useRef<HTMLInputElement>(null);
  const allCategoriesSelected =
    categories.length > 0 && selectedCategoryIds.size === categories.length;
  const someCategoriesSelected = selectedCategoryIds.size > 0 && !allCategoriesSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someCategoriesSelected;
    }
  }, [someCategoriesSelected]);

  useEffect(() => {
    if (state.status !== "error") return;

    setStep(firstErrorStep(state.fieldErrors));
    window.setTimeout(() => {
      document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus();
    }, 0);
  }, [state]);

  function toggleAllCategories(checked: boolean) {
    setSelectedCategoryIds(checked ? new Set(categories.map(({ id }) => id)) : new Set());
    setStepMessage(null);
  }

  function toggleCategory(categoryId: string, checked: boolean) {
    setSelectedCategoryIds((current) => {
      const next = new Set(current);
      if (checked) next.add(categoryId);
      else next.delete(categoryId);
      return next;
    });
    setStepMessage(null);
  }

  function continueToNextStep(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    setStepMessage(null);
    const fields =
      step === 1
        ? ["contactPhone"]
        : step === 2
          ? ["storeName", "businessRegistrationNumber", "websiteUrl", "description"]
          : step === 4
            ? ["state", "city"]
            : [];

    for (const field of fields) {
      const control = getFormControl(form, field);
      if (control && !control.checkValidity()) {
        control.reportValidity();
        control.focus();
        return;
      }
    }

    if (step === 3 && selectedCategoryIds.size === 0) {
      setStepMessage("Choose at least one product category to continue.");
      selectAllRef.current?.focus();
      return;
    }

    setStep((current) => Math.min(current + 1, steps.length));
  }

  return (
    <form action={formAction} className="grid gap-6" noValidate>
      <div aria-live="polite" className="space-y-2 rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
          <span>
            Step {step} of {steps.length}
          </span>
          <span>{steps[step - 1]}</span>
        </div>
        <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-stone-200">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200"
            style={{ width: `${step * 20}%` }}
          />
        </div>
      </div>

      <section
        className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:p-7"
        hidden={step !== 1}
      >
        <div>
          <h2 className="text-2xl font-semibold text-stone-950">Your details</h2>
          <p className="mt-2 text-sm text-stone-600">
            Add the phone number buyers and our team can use to reach your business.
          </p>
        </div>
        <div className="max-w-xl">
          <label className={labelClass} htmlFor="contactPhone">
            Business phone
          </label>
          <Input
            aria-invalid={Boolean(state.fieldErrors?.contactPhone?.[0])}
            autoComplete="tel"
            defaultValue={defaults.contactPhone ?? ""}
            id="contactPhone"
            inputMode="tel"
            name="contactPhone"
            pattern="\+?[0-9][0-9\s-]{7,18}"
            placeholder="+234 800 000 0000"
            required
          />
          <FieldError errors={state.fieldErrors?.contactPhone} />
        </div>
      </section>

      <section
        className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2 sm:p-7"
        hidden={step !== 2}
      >
        <div className="sm:col-span-2">
          <h2 className="text-2xl font-semibold text-stone-950">Your store</h2>
          <p className="mt-2 text-sm text-stone-600">
            Tell buyers the name of your store. The other details can be added later.
          </p>
        </div>
        <div>
          <label className={labelClass} htmlFor="storeName">
            Store or business name
          </label>
          <Input
            aria-invalid={Boolean(state.fieldErrors?.storeName?.[0])}
            autoComplete="organization"
            defaultValue={defaults.storeName}
            id="storeName"
            minLength={2}
            name="storeName"
            required
          />
          <FieldError errors={state.fieldErrors?.storeName} />
        </div>
        <div>
          <label className={labelClass} htmlFor="businessRegistrationNumber">
            Business Registration Number
          </label>
          <Input
            aria-invalid={Boolean(state.fieldErrors?.businessRegistrationNumber?.[0])}
            defaultValue={defaults.businessRegistrationNumber ?? ""}
            id="businessRegistrationNumber"
            name="businessRegistrationNumber"
            pattern="[A-Za-z0-9][A-Za-z0-9./ -]+"
            placeholder="RC, BN, or other registration number"
          />
          <p className="mt-2 text-xs leading-5 text-stone-500">
            Optional — you can add this later.
          </p>
          <FieldError errors={state.fieldErrors?.businessRegistrationNumber} />
        </div>
        <div>
          <label className={labelClass} htmlFor="websiteUrl">
            Website
          </label>
          <Input
            aria-invalid={Boolean(state.fieldErrors?.websiteUrl?.[0])}
            autoComplete="url"
            defaultValue={defaults.websiteUrl ?? ""}
            id="websiteUrl"
            inputMode="url"
            name="websiteUrl"
            placeholder="https://example.com"
            type="url"
          />
          <p className="mt-2 text-xs leading-5 text-stone-500">
            Optional — you can add this later.
          </p>
          <FieldError errors={state.fieldErrors?.websiteUrl} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="description">
            About your business
          </label>
          <textarea
            aria-invalid={Boolean(state.fieldErrors?.description?.[0])}
            className={textareaClass}
            defaultValue={defaults.description ?? ""}
            id="description"
            name="description"
            placeholder="What parts do you sell?"
          />
          <p className="mt-2 text-xs leading-5 text-stone-500">
            Optional — you can add this later.
          </p>
          <FieldError errors={state.fieldErrors?.description} />
        </div>
      </section>

      <fieldset
        className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:p-7"
        hidden={step !== 3}
      >
        <legend className="sr-only">What you sell</legend>
        <div>
          <h2 className="text-2xl font-semibold text-stone-950">What you sell</h2>
          <p className="mt-2 text-sm text-stone-600">
            Choose at least one product category. This helps us show you the right part requests.
          </p>
        </div>
        <label className="flex items-center gap-3 rounded-md border border-stone-300 bg-stone-50 p-3 text-sm font-bold text-stone-900">
          <input
            checked={allCategoriesSelected}
            className="size-4 accent-primary"
            disabled={categories.length === 0}
            onChange={(event) => toggleAllCategories(event.currentTarget.checked)}
            ref={selectAllRef}
            type="checkbox"
          />
          Select all categories
        </label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <label
              className="flex items-start gap-3 rounded-md border border-stone-200 bg-white p-3 text-sm font-medium text-stone-700"
              key={category.id}
            >
              <input
                checked={selectedCategoryIds.has(category.id)}
                className="mt-0.5 size-4 accent-primary"
                name="categoryIds"
                onChange={(event) => toggleCategory(category.id, event.currentTarget.checked)}
                type="checkbox"
                value={category.id}
              />
              {category.label}
            </label>
          ))}
        </div>
        <FieldError errors={state.fieldErrors?.categoryIds} />
      </fieldset>

      <section
        className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2 sm:p-7"
        hidden={step !== 4}
      >
        <div className="sm:col-span-2">
          <h2 className="text-2xl font-semibold text-stone-950">Your location</h2>
          <p className="mt-2 text-sm text-stone-600">Where is your shop or main pickup point?</p>
        </div>
        <div>
          <label className={labelClass} htmlFor="country">
            Country
          </label>
          <Input defaultValue="Nigeria" id="country" name="country" readOnly />
        </div>
        <div>
          <label className={labelClass} htmlFor="state">
            State
          </label>
          <Input
            aria-invalid={Boolean(state.fieldErrors?.state?.[0])}
            autoComplete="address-level1"
            defaultValue={defaults.state ?? ""}
            id="state"
            minLength={2}
            name="state"
            placeholder="Lagos"
            required
          />
          <FieldError errors={state.fieldErrors?.state} />
        </div>
        <div>
          <label className={labelClass} htmlFor="city">
            City
          </label>
          <Input
            aria-invalid={Boolean(state.fieldErrors?.city?.[0])}
            autoComplete="address-level2"
            defaultValue={defaults.city ?? ""}
            id="city"
            minLength={2}
            name="city"
            placeholder="Ikeja"
            required
          />
          <FieldError errors={state.fieldErrors?.city} />
        </div>
      </section>

      <section
        className="rounded-lg border border-stone-200 bg-white p-5 sm:p-7"
        hidden={step !== 5}
      >
        <h2 className="text-2xl font-semibold text-stone-950">Finish</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Your required store details are ready. Save your profile to open the seller portal. You
          can add optional business details later.
        </p>
      </section>

      {stepMessage ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900"
          role="alert"
        >
          {stepMessage}
        </p>
      ) : null}
      <SellerFormAlert state={state} />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step > 1 ? (
          <Button
            onClick={() => {
              setStepMessage(null);
              setStep((current) => Math.max(current - 1, 1));
            }}
            type="button"
            variant="outline"
          >
            Back
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
        {step < steps.length ? (
          <Button onClick={continueToNextStep} type="button">
            Continue
          </Button>
        ) : (
          <SellerSubmitButton pendingLabel="Saving store profile..." type="submit">
            Save store profile
          </SellerSubmitButton>
        )}
      </div>
    </form>
  );
}
