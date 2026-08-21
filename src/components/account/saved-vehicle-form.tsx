"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveVehicleAction,
} from "@/app/(protected)/account/actions";
import { initialBuyerActionState } from "@/lib/account/buyer-action-state";
import { AuthAlert } from "@/components/auth/auth-alert";
import { Button } from "@/components/ui/button";
import type { MarketplaceVehicleOption } from "@/lib/marketplace/public-catalog";

function SaveVehicleButton() {
  const { pending } = useFormStatus();
  return <Button disabled={pending}>{pending ? "Saving vehicle..." : "Save vehicle"}</Button>;
}

export function SavedVehicleForm({ vehicles }: { vehicles: MarketplaceVehicleOption[] }) {
  const [state, action] = useActionState(saveVehicleAction, initialBuyerActionState);

  return (
    <form action={action} className="grid gap-5 rounded-xl border border-stone-200 bg-white p-5" noValidate>
      <div>
        <h2 className="text-xl font-semibold text-stone-950">Add a vehicle</h2>
        <p className="mt-1 text-sm text-stone-600">Choose an exact fitment from the marketplace vehicle catalogue.</p>
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-semibold" htmlFor="fitmentId">Vehicle</label>
        <select
          aria-invalid={Boolean(state.fieldErrors?.fitmentId?.[0])}
          className="min-h-12 rounded-md border border-stone-300 bg-white px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          id="fitmentId"
          name="fitmentId"
          required
        >
          <option value="">Choose year, make, model, and configuration</option>
          {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>)}
        </select>
        {state.fieldErrors?.fitmentId?.[0] ? <p className="text-sm font-medium text-primary">{state.fieldErrors.fitmentId[0]}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-semibold" htmlFor="vehicle-label">Label (optional)</label>
          <input className="h-12 rounded-md border border-stone-300 px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" id="vehicle-label" maxLength={80} name="label" placeholder="My Camry or Customer Hilux" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-semibold" htmlFor="registrationNumber">Registration number (optional)</label>
          <input className="h-12 rounded-md border border-stone-300 px-3 uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" id="registrationNumber" maxLength={30} name="registrationNumber" placeholder="ABC-123XY" />
        </div>
      </div>
      <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
        <input className="size-4 accent-primary" name="isDefault" type="checkbox" />
        Use as my default marketplace vehicle
      </label>
      <AuthAlert state={state} />
      <div><SaveVehicleButton /></div>
    </form>
  );
}