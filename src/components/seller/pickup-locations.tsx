import { Archive, CheckCircle2, MapPin, Plus } from "lucide-react";

import {
  archivePickupLocationAction,
  savePickupLocationAction,
  setDefaultPickupLocationAction,
} from "@/app/(protected)/seller/onboarding/delivery-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ANAMBRA_LGAS } from "@/lib/delivery/anambra";

export type PickupLocationValue = {
  contactName: string;
  contactPhone: string;
  id: string;
  isDefault: boolean;
  label: string;
  landmark: string | null;
  latitude: number | null;
  lga: string;
  longitude: number | null;
  streetAddress: string;
  town: string;
};

const labelClass = "mb-2 block text-sm font-semibold text-stone-800";
const selectClass = "flex h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function PickupLocationFields({ location }: { location?: PickupLocationValue }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {location ? <input name="id" type="hidden" value={location.id} /> : null}
      <div>
        <label className={labelClass} htmlFor={`label-${location?.id ?? "new"}`}>Location name</label>
        <Input defaultValue={location?.label ?? ""} id={`label-${location?.id ?? "new"}`} name="label" placeholder="Main shop" required />
      </div>
      <div>
        <label className={labelClass} htmlFor={`lga-${location?.id ?? "new"}`}>LGA</label>
        <select className={selectClass} defaultValue={location?.lga ?? ""} id={`lga-${location?.id ?? "new"}`} name="lga" required>
          <option value="">Choose an LGA</option>
          {ANAMBRA_LGAS.map((lga) => <option key={lga} value={lga}>{lga}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor={`town-${location?.id ?? "new"}`}>Town or community</label>
        <Input defaultValue={location?.town ?? ""} id={`town-${location?.id ?? "new"}`} name="town" required />
      </div>
      <div>
        <label className={labelClass} htmlFor={`state-${location?.id ?? "new"}`}>State</label>
        <Input id={`state-${location?.id ?? "new"}`} readOnly value="Anambra" />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor={`street-${location?.id ?? "new"}`}>Street address</label>
        <Input defaultValue={location?.streetAddress ?? ""} id={`street-${location?.id ?? "new"}`} name="streetAddress" required />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor={`landmark-${location?.id ?? "new"}`}>Nearest landmark <span className="font-normal text-stone-500">- Optional</span></label>
        <Input defaultValue={location?.landmark ?? ""} id={`landmark-${location?.id ?? "new"}`} name="landmark" />
      </div>
      <div>
        <label className={labelClass} htmlFor={`contact-${location?.id ?? "new"}`}>Pickup contact name</label>
        <Input defaultValue={location?.contactName ?? ""} id={`contact-${location?.id ?? "new"}`} name="contactName" required />
      </div>
      <div>
        <label className={labelClass} htmlFor={`phone-${location?.id ?? "new"}`}>Pickup contact phone</label>
        <Input defaultValue={location?.contactPhone ?? ""} id={`phone-${location?.id ?? "new"}`} inputMode="tel" name="contactPhone" required />
      </div>
      <div>
        <label className={labelClass} htmlFor={`latitude-${location?.id ?? "new"}`}>Latitude <span className="font-normal text-stone-500">- Optional</span></label>
        <Input defaultValue={location?.latitude ?? ""} id={`latitude-${location?.id ?? "new"}`} inputMode="decimal" name="latitude" type="number" step="any" />
      </div>
      <div>
        <label className={labelClass} htmlFor={`longitude-${location?.id ?? "new"}`}>Longitude <span className="font-normal text-stone-500">- Optional</span></label>
        <Input defaultValue={location?.longitude ?? ""} id={`longitude-${location?.id ?? "new"}`} inputMode="decimal" name="longitude" type="number" step="any" />
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold text-stone-700 sm:col-span-2">
        <input className="size-4 accent-primary" defaultChecked={location?.isDefault ?? false} name="isDefault" type="checkbox" />
        Use as my default pickup location
      </label>
    </div>
  );
}
export function PickupLocations({
  error,
  locations,
  message,
}: {
  error?: string;
  locations: PickupLocationValue[];
  message?: string;
}) {
  return (
    <section className="mt-8 scroll-mt-28" id="pickup-locations">
      <div className="mb-5 flex items-start gap-3">
        <MapPin aria-hidden="true" className="mt-1 size-5 text-primary" />
        <div>
          <h2 className="text-2xl font-semibold text-stone-950">Pickup locations</h2>
          <p className="mt-1 text-sm text-stone-600">Add where your products leave from. Contact details stay private and are used only for fulfilment.</p>
        </div>
      </div>
      {message ? <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900" role="status">{message}</p> : null}
      {error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-900" role="alert">{error}</p> : null}
      <div className="grid gap-5">
        {locations.map((location) => (
          <article className="rounded-lg border border-stone-200 bg-white p-5" key={location.id}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-stone-950">{location.label}</h3>
                <p className="text-sm text-stone-600">{location.town}, {location.lga}, Anambra</p>
              </div>
              {location.isDefault ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800"><CheckCircle2 aria-hidden="true" className="size-3.5" />Default</span> : null}
            </div>
            <form action={savePickupLocationAction}>
              <PickupLocationFields location={location} />
              <div className="mt-5 flex flex-wrap gap-3">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
            <div className="mt-3 flex flex-wrap gap-3 border-t border-stone-200 pt-3">
              {!location.isDefault ? <form action={setDefaultPickupLocationAction}><input name="id" type="hidden" value={location.id} /><Button type="submit" variant="outline">Make default</Button></form> : null}
              <form action={archivePickupLocationAction}><input name="id" type="hidden" value={location.id} /><Button type="submit" variant="ghost"><Archive aria-hidden="true" className="size-4" />Archive</Button></form>
            </div>
          </article>
        ))}
        <details className="rounded-lg border border-stone-200 bg-white p-5" open={locations.length === 0}>
          <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-stone-950"><Plus aria-hidden="true" className="size-4 text-primary" />Add pickup location</summary>
          <form action={savePickupLocationAction} className="mt-5">
            <PickupLocationFields />
            <Button className="mt-5" type="submit">Save pickup location</Button>
          </form>
        </details>
      </div>
    </section>
  );
}
