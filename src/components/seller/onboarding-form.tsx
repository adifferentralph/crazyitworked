"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";

import { completeSellerOnboardingAction } from "@/app/(protected)/seller/actions";
import { SellerFormAlert } from "@/components/seller/seller-form-alert";
import { SellerSubmitButton } from "@/components/seller/seller-submit-button";
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

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <p className="mt-2 text-sm text-primary">{errors[0]}</p> : null;
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

  function toggleAllCategories(checked: boolean) {
    setSelectedCategoryIds(checked ? new Set(categories.map(({ id }) => id)) : new Set());
  }

  function toggleCategory(categoryId: string, checked: boolean) {
    setSelectedCategoryIds((current) => {
      const next = new Set(current);
      if (checked) next.add(categoryId);
      else next.delete(categoryId);
      return next;
    });
  }

  return (
    <form action={formAction} className="grid gap-7" noValidate>
      <div className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
        <div className="sm:col-span-2">
          <h2 className="text-2xl font-semibold text-stone-950">Business profile</h2>
          <p className="mt-2 text-sm text-stone-600">
            Start with your trading details. Formal business verification can be completed
            progressively.
          </p>
        </div>
        <div>
          <label className={labelClass} htmlFor="storeName">
            Store or business name
          </label>
          <Input
            autoComplete="organization"
            defaultValue={defaults.storeName}
            id="storeName"
            name="storeName"
          />
          <FieldError errors={state.fieldErrors?.storeName} />
        </div>
        <div>
          <label className={labelClass} htmlFor="businessRegistrationNumber">
            Business Registration Number{" "}
            <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <Input
            defaultValue={defaults.businessRegistrationNumber ?? ""}
            id="businessRegistrationNumber"
            name="businessRegistrationNumber"
            placeholder="RC, BN, or other registration number"
          />
          <p className="mt-2 text-xs leading-5 text-stone-500">
            You can add this later to complete business verification.
          </p>
          <FieldError errors={state.fieldErrors?.businessRegistrationNumber} />
        </div>
        <div>
          <label className={labelClass} htmlFor="contactPhone">
            Business phone
          </label>
          <Input
            autoComplete="tel"
            defaultValue={defaults.contactPhone ?? ""}
            id="contactPhone"
            inputMode="tel"
            name="contactPhone"
            placeholder="+234 800 000 0000"
          />
          <FieldError errors={state.fieldErrors?.contactPhone} />
        </div>
        <div>
          <label className={labelClass} htmlFor="websiteUrl">
            Website <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <Input
            autoComplete="url"
            defaultValue={defaults.websiteUrl ?? ""}
            id="websiteUrl"
            inputMode="url"
            name="websiteUrl"
            placeholder="https://example.com"
            type="url"
          />
          <FieldError errors={state.fieldErrors?.websiteUrl} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="description">
            About your business <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <textarea
            className={textareaClass}
            defaultValue={defaults.description ?? ""}
            id="description"
            name="description"
            placeholder="Tell buyers what you specialise in, how long you have traded, and how you source parts."
          />
          <FieldError errors={state.fieldErrors?.description} />
        </div>
      </div>

      <fieldset className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:p-7">
        <legend className="text-2xl font-semibold text-stone-950">Product categories</legend>
        <p className="text-sm text-stone-600">
          Choose the systems you stock. Suppliers are matched to relevant buyer requests using these
          categories.
        </p>
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

      <div className="grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
        <div className="sm:col-span-2">
          <h2 className="text-2xl font-semibold text-stone-950">Operating location</h2>
          <p className="mt-2 text-sm text-stone-600">
            Use the primary location from which you fulfil orders.
          </p>
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
            autoComplete="address-level1"
            defaultValue={defaults.state ?? ""}
            id="state"
            name="state"
            placeholder="Lagos"
          />
          <FieldError errors={state.fieldErrors?.state} />
        </div>
        <div>
          <label className={labelClass} htmlFor="city">
            City
          </label>
          <Input
            autoComplete="address-level2"
            defaultValue={defaults.city ?? ""}
            id="city"
            name="city"
            placeholder="Ikeja"
          />
          <FieldError errors={state.fieldErrors?.city} />
        </div>
      </div>

      <SellerFormAlert state={state} />
      <div>
        <SellerSubmitButton pendingLabel="Saving store profile..." type="submit">
          Save store profile
        </SellerSubmitButton>
      </div>
    </form>
  );
}
