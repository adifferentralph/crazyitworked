import { asc, eq } from "drizzle-orm";
import { MapPin, Trash2 } from "lucide-react";

import {
  deleteBuyerAddressAction,
  saveBuyerAddressAction,
  setDefaultBuyerAddressAction,
} from "@/app/(protected)/account/addresses/actions";
import { AccountSectionPage } from "@/components/account/account-section-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDatabase } from "@/db/client";
import { addresses } from "@/db/schema";
import { requireRole } from "@/lib/auth/principal";
import { ANAMBRA_LGAS } from "@/lib/delivery/anambra";

const labelClass = "mb-2 block text-sm font-semibold text-stone-800";

export default async function AccountAddressesPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const principal = await requireRole(["BUYER"], "/account/addresses");
  const [saved, query] = await Promise.all([
    getDatabase().select().from(addresses).where(eq(addresses.userId, principal.id)).orderBy(asc(addresses.createdAt)),
    searchParams,
  ]);

  return (
    <AccountSectionPage description="Save Anambra delivery addresses so checkout is faster." icon={MapPin} title="Addresses">
      {query.message ? <p className="mb-5 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900" role="status">{query.message}</p> : null}
      {query.error ? <p className="mb-5 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-900" role="alert">{query.error}</p> : null}
      {saved.length ? <div className="grid gap-3 sm:grid-cols-2">{saved.map((address) => <article className="rounded-lg border border-stone-200 bg-white p-4" key={address.id}><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-stone-950">{address.label}{address.isDefault ? <span className="ml-2 text-xs text-primary">Default</span> : null}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{address.recipientName}<br />{address.line1}<br />{address.town ?? address.city}, {address.lga ? `${address.lga} LGA, ` : ""}Anambra<br />{address.phone}</p>{address.landmark ? <p className="mt-2 text-xs text-stone-500">Near {address.landmark}</p> : null}</div><form action={deleteBuyerAddressAction}><input name="addressId" type="hidden" value={address.id} /><Button aria-label={`Delete ${address.label}`} size="icon" type="submit" variant="ghost"><Trash2 aria-hidden="true" className="size-4" /></Button></form></div>{!address.isDefault ? <form action={setDefaultBuyerAddressAction} className="mt-3"><input name="addressId" type="hidden" value={address.id} /><Button size="sm" type="submit" variant="outline">Make default</Button></form> : null}</article>)}</div> : <p className="rounded-lg border border-dashed border-stone-300 p-6 text-sm text-stone-600">No addresses saved yet.</p>}
      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-xl font-bold text-stone-950">Add delivery address</h2>
        <form action={saveBuyerAddressAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><label className={labelClass} htmlFor="label">Address label</label><Input id="label" name="label" placeholder="Home" required /></div>
          <div><label className={labelClass} htmlFor="recipientName">Recipient name</label><Input id="recipientName" name="recipientName" required /></div>
          <div><label className={labelClass} htmlFor="phone">Phone number</label><Input id="phone" name="phone" required /></div>
          <div><label className={labelClass} htmlFor="lga">LGA</label><select className="h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm" id="lga" name="lga" required><option value="">Choose LGA</option>{ANAMBRA_LGAS.map((lga) => <option key={lga} value={lga}>{lga}</option>)}</select></div>
          <div><label className={labelClass} htmlFor="town">Town or community</label><Input id="town" name="town" required /></div>
          <div><label className={labelClass} htmlFor="line1">Street address</label><Input id="line1" name="line1" required /></div>
          <div className="sm:col-span-2"><label className={labelClass} htmlFor="landmark">Nearest landmark <span className="font-normal text-stone-500">— Optional</span></label><Input id="landmark" name="landmark" /></div>
          <div><label className={labelClass} htmlFor="latitude">Latitude <span className="font-normal text-stone-500">— Optional</span></label><Input id="latitude" inputMode="decimal" name="latitude" /></div>
          <div><label className={labelClass} htmlFor="longitude">Longitude <span className="font-normal text-stone-500">— Optional</span></label><Input id="longitude" inputMode="decimal" name="longitude" /></div>
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input name="isDefault" type="checkbox" />Use as my default delivery address</label>
          <Button className="sm:col-span-2" type="submit">Save address</Button>
        </form>
      </section>
    </AccountSectionPage>
  );
}
