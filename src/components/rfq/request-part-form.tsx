"use client";

import Link from "next/link";
import { Camera, CarFront, MapPin, PackageSearch } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createPartRequestAction } from "@/app/(protected)/rfq-actions";
import { Button } from "@/components/ui/button";
import { initialRfqActionState } from "@/lib/rfq/action-state";

const inputClass = "h-12 w-full rounded-md border border-stone-300 bg-white px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const labelClass = "text-sm font-semibold text-stone-800";
const conditions = [
  ["NEW", "New"],
  ["USED", "Used"],
  ["REFURBISHED", "Refurbished"],
  ["RECONDITIONED", "Reconditioned"],
  ["OEM_TAKE_OFF", "OEM take-off"],
  ["AFTERMARKET", "Aftermarket"],
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button className="w-full sm:w-auto" disabled={pending} size="lg">{pending ? "Submitting request..." : "Submit part request"}</Button>;
}

function ErrorText({ errors }: { errors?: string[] }) {
  return errors?.[0] ? <p className="text-sm font-medium text-primary">{errors[0]}</p> : null;
}

type Category = { id: string; label: string };
type SavedVehicle = {
  fitment_id: string;
  id: string;
  is_default: boolean;
  label: string | null;
  registration_number: string | null;
  vehicle: { label: string } | null;
};

export function RequestPartForm({ categories, savedVehicles }: { categories: Category[]; savedVehicles: SavedVehicle[] }) {
  const [state, action] = useActionState(createPartRequestAction, initialRfqActionState);

  return (
    <form action={action} className="grid gap-6" encType="multipart/form-data" noValidate>
      <section className="grid gap-5 rounded-xl border border-stone-200 bg-white p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <PackageSearch className="mt-1 size-5 text-primary" aria-hidden="true" />
          <div><h2 className="text-2xl font-semibold text-stone-950">Part details</h2><p className="mt-1 text-sm text-stone-600">Share the identifiers and context a supplier needs to quote accurately.</p></div>
        </div>
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="partName">Part needed</label>
          <input className={inputClass} id="partName" maxLength={160} name="partName" placeholder="Front brake pad set" required />
          <ErrorText errors={state.fieldErrors?.partName} />
        </div>
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="categoryId">Category</label>
          <select className={inputClass} id="categoryId" name="categoryId" required>
            <option value="">Choose a category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </select>
          <ErrorText errors={state.fieldErrors?.categoryId} />
        </div>
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="description">What should suppliers know?</label>
          <textarea className="min-h-32 rounded-md border border-stone-300 p-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" id="description" maxLength={3000} name="description" placeholder="Symptoms, side of vehicle, dimensions, markings, or anything already checked..." required />
          <ErrorText errors={state.fieldErrors?.description} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><label className={labelClass} htmlFor="oemPartNumber">OEM part number (optional)</label><input className={inputClass} id="oemPartNumber" maxLength={120} name="oemPartNumber" /></div>
          <div className="grid gap-2"><label className={labelClass} htmlFor="manufacturerPartNumber">Manufacturer number (optional)</label><input className={inputClass} id="manufacturerPartNumber" maxLength={120} name="manufacturerPartNumber" /></div>
        </div>
        <div className="grid gap-2"><label className={labelClass} htmlFor="quantity">Quantity</label><input className={`${inputClass} max-w-32`} defaultValue="1" id="quantity" max="1000" min="1" name="quantity" type="number" /><ErrorText errors={state.fieldErrors?.quantity} /></div>
        <fieldset className="grid gap-3"><legend className={labelClass}>Condition preferences (optional)</legend><div className="flex flex-wrap gap-2">{conditions.map(([value, label]) => <label className="flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm" key={value}><input className="size-4 accent-primary" name="conditionPreferences" type="checkbox" value={value} />{label}</label>)}</div></fieldset>
      </section>

      <section className="grid gap-5 rounded-xl border border-stone-200 bg-white p-5 sm:p-7">
        <div className="flex items-start gap-3"><CarFront className="mt-1 size-5 text-primary" aria-hidden="true" /><div><h2 className="text-2xl font-semibold text-stone-950">Vehicle</h2><p className="mt-1 text-sm text-stone-600">An exact saved vehicle improves matching and fitment context.</p></div></div>
        <div className="grid gap-2">
          <label className={labelClass} htmlFor="savedVehicleId">Saved vehicle (optional)</label>
          <select className={inputClass} defaultValue={savedVehicles.find((vehicle) => vehicle.is_default)?.id ?? ""} id="savedVehicleId" name="savedVehicleId">
            <option value="">No vehicle selected</option>
            {savedVehicles.map((saved) => <option key={saved.id} value={saved.id}>{saved.label || saved.vehicle?.label || "Saved vehicle"}{saved.registration_number ? ` · ${saved.registration_number}` : ""}</option>)}
          </select>
          {!savedVehicles.length ? <p className="text-sm text-stone-600">No saved vehicles. <Link className="font-semibold text-primary underline" href="/account/vehicles">Add a vehicle</Link> or submit without one.</p> : null}
          <ErrorText errors={state.fieldErrors?.savedVehicleId} />
        </div>
      </section>

      <section className="grid gap-5 rounded-xl border border-stone-200 bg-white p-5 sm:p-7">
        <div className="flex items-start gap-3"><Camera className="mt-1 size-5 text-primary" aria-hidden="true" /><div><h2 className="text-2xl font-semibold text-stone-950">Photos</h2><p className="mt-1 text-sm text-stone-600">Optional. Add up to five clear JPG, PNG, or WebP images, 8 MB each.</p></div></div>
        <input accept="image/jpeg,image/png,image/webp" className="block w-full rounded-md border border-stone-300 bg-white p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-2 file:font-semibold file:text-white" multiple name="images" type="file" />
      </section>

      <section className="grid gap-5 rounded-xl border border-stone-200 bg-white p-5 sm:p-7">
        <div className="flex items-start gap-3"><MapPin className="mt-1 size-5 text-primary" aria-hidden="true" /><div><h2 className="text-2xl font-semibold text-stone-950">Budget and delivery</h2><p className="mt-1 text-sm text-stone-600">Budget is optional and all prices are entered in NGN.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><label className={labelClass} htmlFor="budgetMinNgn">Minimum budget (optional)</label><input className={inputClass} id="budgetMinNgn" inputMode="decimal" name="budgetMinNgn" placeholder="25000" /><ErrorText errors={state.fieldErrors?.budgetMinMinor} /></div><div className="grid gap-2"><label className={labelClass} htmlFor="budgetMaxNgn">Maximum budget (optional)</label><input className={inputClass} id="budgetMaxNgn" inputMode="decimal" name="budgetMaxNgn" placeholder="60000" /><ErrorText errors={state.fieldErrors?.budgetMaxMinor} /></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><label className={labelClass} htmlFor="deliveryState">Delivery state</label><input className={inputClass} id="deliveryState" name="deliveryState" placeholder="Lagos" required /><ErrorText errors={state.fieldErrors?.deliveryState} /></div><div className="grid gap-2"><label className={labelClass} htmlFor="deliveryCity">Delivery city</label><input className={inputClass} id="deliveryCity" name="deliveryCity" placeholder="Ikeja" required /><ErrorText errors={state.fieldErrors?.deliveryCity} /></div></div>
      </section>

      {state.message ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900" role="alert">{state.message}</div> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><SubmitButton /><p className="text-xs leading-5 text-stone-500">Submitting makes the request visible only to matched verified suppliers.</p></div>
    </form>
  );
}