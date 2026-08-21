import { CarFront, CircleCheck, Trash2 } from "lucide-react";

import {
  deleteSavedVehicleAction,
  setDefaultVehicleAction,
} from "@/app/(protected)/account/actions";
import { AccountSectionPage } from "@/components/account/account-section-page";
import { SavedVehicleForm } from "@/components/account/saved-vehicle-form";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { getMarketplaceOptions } from "@/lib/marketplace/public-catalog";
import { createClient } from "@/lib/supabase/server";

export default async function SavedVehiclesPage() {
  const principal = await requireRole(["BUYER"], "/account/vehicles");
  const supabase = await createClient();
  const [{ data: savedVehicles }, options] = await Promise.all([
    supabase
      .from("saved_vehicles")
      .select("id, fitment_id, label, registration_number, is_default")
      .eq("buyer_id", principal.id)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false }),
    getMarketplaceOptions(),
  ]);
  const optionById = new Map(options.vehicles.map((vehicle) => [vehicle.id, vehicle]));

  return (
    <AccountSectionPage
      description="Keep multiple personal, customer, or fleet vehicles ready for accurate part searches and requests."
      icon={CarFront}
      title="Saved Vehicles"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
        <div className="grid content-start gap-3">
          <h2 className="text-xl font-semibold text-stone-950">Your vehicles</h2>
          {savedVehicles?.length ? savedVehicles.map((saved) => {
            const vehicle = optionById.get(saved.fitment_id);
            return (
              <article className="rounded-xl border border-stone-200 bg-white p-5" key={saved.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-body text-lg font-bold text-stone-950">{saved.label || vehicle?.label || "Saved vehicle"}</h3>
                      {saved.is_default ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800"><CircleCheck className="size-3.5" aria-hidden="true" />Default</span> : null}
                    </div>
                    {saved.label && vehicle ? <p className="mt-2 text-sm text-stone-600">{vehicle.label}</p> : null}
                    {saved.registration_number ? <p className="mt-2 font-mono text-xs font-bold uppercase text-stone-500">{saved.registration_number}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!saved.is_default ? (
                      <form action={setDefaultVehicleAction}>
                        <input name="vehicleId" type="hidden" value={saved.id} />
                        <Button size="sm" type="submit" variant="outline">Make default</Button>
                      </form>
                    ) : null}
                    <form action={deleteSavedVehicleAction}>
                      <input name="vehicleId" type="hidden" value={saved.id} />
                      <Button aria-label={`Remove ${saved.label || vehicle?.label || "saved vehicle"}`} size="sm" type="submit" variant="ghost"><Trash2 className="size-4" aria-hidden="true" />Remove</Button>
                    </form>
                  </div>
                </div>
              </article>
            );
          }) : (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center">
              <CarFront className="mx-auto size-9 text-stone-300" aria-hidden="true" />
              <h3 className="mt-4 font-body text-lg font-bold text-stone-950">No saved vehicles yet</h3>
              <p className="mt-2 text-sm text-stone-600">Add the first vehicle you regularly source parts for.</p>
            </div>
          )}
        </div>
        <SavedVehicleForm vehicles={options.vehicles} />
      </div>
    </AccountSectionPage>
  );
}