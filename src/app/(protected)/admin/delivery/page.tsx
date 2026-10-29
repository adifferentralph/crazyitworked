import { Route, ShieldCheck, Truck, Weight } from "lucide-react";

import {
  activateDeliveryConfigAction,
  addFallbackRateAction,
  addVehicleCategoryAction,
  addWeightBracketAction,
  createDeliveryConfigAction,
  deactivateDeliveryAction,
} from "@/app/(protected)/admin/delivery/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdminPermission } from "@/lib/auth/permissions";
import { getDeliverySettings } from "@/lib/delivery/settings";
import { formatNgn } from "@/lib/marketplace/products";

const labelClass = "mb-2 block text-sm font-semibold text-stone-800";
const selectClass = "h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm";

export default async function AdminDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  await requireAdminPermission("admin.manage", "/admin/delivery");
  const [settings, query] = await Promise.all([getDeliverySettings(), searchParams]);
  const config = settings.config;

  return (
    <AdminShell
      description="Create versioned Anambra delivery pricing, configure shipment limits and fallback routes, then explicitly activate a reviewed version."
      title="Delivery settings"
    >
      {query.message ? <p className="mb-5 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-900" role="status">{query.message}</p> : null}
      {query.error ? <p className="mb-5 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-900" role="alert">{query.error}</p> : null}

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Current version</p>
            <h2 className="mt-1 text-xl font-bold text-stone-950">{config ? `v${config.version} · ${config.name}` : "No delivery pricing yet"}</h2>
            <p className="mt-2 text-sm text-stone-600">{config?.serviceActive && config.productionApproved ? "Active for live checkout" : "Inactive. Checkout cannot create a delivery quote from this version."}</p>
          </div>
          {config ? config.serviceActive ? (
            <form action={deactivateDeliveryAction}><input name="configId" type="hidden" value={config.id} /><Button type="submit" variant="outline">Pause delivery quotes</Button></form>
          ) : (
            <form action={activateDeliveryConfigAction}><input name="configId" type="hidden" value={config.id} /><Button type="submit"><ShieldCheck aria-hidden="true" className="size-4" />Activate reviewed version</Button></form>
          ) : null}
        </div>
        {config ? (
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
            <div><dt className="text-stone-500">Base charge</dt><dd className="font-bold">{formatNgn(config.baseChargeMinor)}</dd></div>
            <div><dt className="text-stone-500">Per road km</dt><dd className="font-bold">{formatNgn(config.costPerKmMinor)}</dd></div>
            <div><dt className="text-stone-500">Minimum charge</dt><dd className="font-bold">{formatNgn(config.minimumChargeMinor)}</dd></div>
            <div><dt className="text-stone-500">Automatic fee limit</dt><dd className="font-bold">{formatNgn(config.maximumAutomaticFeeMinor)}</dd></div>
          </dl>
        ) : null}
      </section>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-xl font-bold text-stone-950">Create a new inactive pricing version</h2>
        <p className="mt-2 text-sm text-stone-600">Amounts are in naira. The new version remains inactive until vehicles and a reliable routing fallback are configured.</p>
        <form action={createDeliveryConfigAction} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="sm:col-span-2 xl:col-span-4"><label className={labelClass} htmlFor="name">Version name</label><Input id="name" name="name" placeholder="October Anambra rates" required /></div>
          {[
            ["baseCharge", "Base charge (NGN)"],
            ["minimumCharge", "Minimum charge (NGN)"],
            ["costPerKm", "Cost per road km (NGN)"],
            ["handlingCharge", "Handling charge (NGN)"],
            ["fragileSurcharge", "Fragile surcharge (NGN)"],
            ["bulkySurcharge", "Bulky surcharge (NGN)"],
            ["marketplaceMarkup", "Marketplace delivery component (NGN)"],
            ["maximumAutomaticFee", "Maximum automatic fee (NGN)"],
          ].map(([name, label]) => <div key={name}><label className={labelClass} htmlFor={name}>{label}</label><Input defaultValue="0.00" id={name} inputMode="decimal" name={name} required /></div>)}
          <div><label className={labelClass} htmlFor="roundingStepMinor">Rounding step (kobo)</label><Input defaultValue="100" id="roundingStepMinor" min="1" name="roundingStepMinor" type="number" required /></div>
          <div><label className={labelClass} htmlFor="manualQuoteAboveGrams">Manual quote above grams <span className="font-normal text-stone-500">— Optional</span></label><Input id="manualQuoteAboveGrams" min="1" name="manualQuoteAboveGrams" type="number" /></div>
          <div><label className={labelClass} htmlFor="manualQuoteAboveVolumeMm3">Manual quote above mm³ <span className="font-normal text-stone-500">— Optional</span></label><Input id="manualQuoteAboveVolumeMm3" min="1" name="manualQuoteAboveVolumeMm3" type="number" /></div>
          <div><label className={labelClass} htmlFor="handlingMinDays">Handling min days</label><Input defaultValue="0" id="handlingMinDays" min="0" name="handlingMinDays" type="number" required /></div>
          <div><label className={labelClass} htmlFor="handlingMaxDays">Handling max days</label><Input defaultValue="1" id="handlingMaxDays" min="0" name="handlingMaxDays" type="number" required /></div>
          <div><label className={labelClass} htmlFor="transitMinDays">Transit min days</label><Input defaultValue="1" id="transitMinDays" min="0" name="transitMinDays" type="number" required /></div>
          <div><label className={labelClass} htmlFor="transitMaxDays">Transit max days</label><Input defaultValue="7" id="transitMaxDays" min="0" name="transitMaxDays" type="number" required /></div>
          <fieldset className="grid gap-3 rounded-md border border-stone-200 p-4 sm:col-span-2 xl:col-span-4">
            <legend className="px-2 text-sm font-bold">Return policy used in product search data</legend>
            <label className="flex items-center gap-2 text-sm font-semibold"><input name="returnPolicyActive" type="checkbox" />Enable the configured marketplace return policy</label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div><label className={labelClass} htmlFor="returnWindowDays">Return window (days)</label><Input id="returnWindowDays" min="1" name="returnWindowDays" type="number" /></div>
              <div><label className={labelClass} htmlFor="returnMethod">Return method</label><select className={selectClass} id="returnMethod" name="returnMethod"><option value="">Choose</option><option value="RETURN_BY_MAIL">Return by delivery</option><option value="RETURN_IN_STORE">Return at seller location</option></select></div>
              <div><label className={labelClass} htmlFor="returnFees">Return delivery fee</label><select className={selectClass} id="returnFees" name="returnFees"><option value="">Choose</option><option value="FREE_RETURN">Free return</option><option value="RETURN_SHIPPING_FEES">Buyer pays return delivery</option></select></div>
            </div>
          </fieldset>
          <Button className="sm:col-span-2 xl:col-span-4" type="submit">Create inactive pricing version</Button>
        </form>
      </section>

      {config ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2"><Weight aria-hidden="true" className="size-5 text-primary" /><h2 className="text-lg font-bold">Weight brackets</h2></div>
            <ul className="mt-3 grid gap-2 text-sm">{settings.weightBrackets.map((item) => <li className="rounded-md bg-stone-50 p-3" key={item.id}>{item.minGrams}g–{item.maxGrams ? `${item.maxGrams}g` : "and above"}: {formatNgn(item.surchargeMinor)}</li>)}</ul>
            <form action={addWeightBracketAction} className="mt-4 grid gap-3"><input name="configId" type="hidden" value={config.id} /><Input name="minGrams" placeholder="Minimum grams" type="number" required /><Input name="maxGrams" placeholder="Maximum grams (optional)" type="number" /><Input name="surcharge" placeholder="Surcharge NGN" required /><Input defaultValue={settings.weightBrackets.length} name="position" type="hidden" /><Button size="sm" type="submit">Add bracket</Button></form>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2"><Truck aria-hidden="true" className="size-5 text-primary" /><h2 className="text-lg font-bold">Vehicle categories</h2></div>
            <ul className="mt-3 grid gap-2 text-sm">{settings.vehicles.map((item) => <li className="rounded-md bg-stone-50 p-3" key={item.id}><span className="font-bold">{item.name}</span><br />Up to {item.maxWeightGrams}g · {formatNgn(item.surchargeMinor)}</li>)}</ul>
            <form action={addVehicleCategoryAction} className="mt-4 grid gap-3"><input name="configId" type="hidden" value={config.id} /><Input name="name" placeholder="Motorcycle" required /><Input name="code" placeholder="MOTORCYCLE" required /><Input name="maxWeightGrams" placeholder="Maximum grams" type="number" required /><div className="grid grid-cols-3 gap-2"><Input name="maxLengthMm" placeholder="L mm" type="number" /><Input name="maxWidthMm" placeholder="W mm" type="number" /><Input name="maxHeightMm" placeholder="H mm" type="number" /></div><Input name="surcharge" placeholder="Surcharge NGN" required /><Input defaultValue={settings.vehicles.length} name="position" type="hidden" /><Button size="sm" type="submit">Add vehicle</Button></form>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="flex items-center gap-2"><Route aria-hidden="true" className="size-5 text-primary" /><h2 className="text-lg font-bold">Fallback town rates</h2></div>
            <ul className="mt-3 grid max-h-64 gap-2 overflow-y-auto text-sm">{settings.fallbackRates.map((item) => <li className="rounded-md bg-stone-50 p-3" key={item.id}>{item.originTown} → {item.destinationTown}: {formatNgn(item.feeMinor)}</li>)}</ul>
            <form action={addFallbackRateAction} className="mt-4 grid gap-3"><input name="configId" type="hidden" value={config.id} /><Input name="originTown" placeholder="Origin town" required /><Input name="destinationTown" placeholder="Destination town" required /><Input inputMode="decimal" name="distanceKm" placeholder="Road km (optional)" /><Input name="fee" placeholder="Fallback distance charge NGN" required /><Button size="sm" type="submit">Add route</Button></form>
          </section>
        </div>
      ) : null}

      {config ? <p className="mt-6 text-xs leading-5 text-stone-500">This version uses exact NGN minor units internally. Customer checkout shows only one combined delivery fee; route, vehicle, and per-seller calculations remain private.</p> : null}
    </AdminShell>
  );
}
