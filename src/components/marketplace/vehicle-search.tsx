"use client";

import { useMemo, useState } from "react";
import { CarFront, CircleCheck } from "lucide-react";

import type { MarketplaceVehicleOption } from "@/lib/marketplace/public-catalog";

const selectClass = "h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function unique<T extends { id: string; label: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export function VehicleSearch({ initialVehicle, vehicles }: { initialVehicle?: string; vehicles: MarketplaceVehicleOption[] }) {
  const initial = vehicles.find((vehicle) => vehicle.id === initialVehicle);
  const [makeId, setMakeId] = useState(initial?.makeId ?? "");
  const [modelId, setModelId] = useState(initial?.modelId ?? "");
  const [yearId, setYearId] = useState(initial?.yearId ?? "");
  const [trimId, setTrimId] = useState(initial?.trimId ?? "");
  const [engineId, setEngineId] = useState(initial?.engineId ?? "");

  const makes = useMemo(() => unique(vehicles.map((vehicle) => ({ id: vehicle.makeId, label: vehicle.make }))), [vehicles]);
  const models = useMemo(() => unique(vehicles.filter((vehicle) => vehicle.makeId === makeId).map((vehicle) => ({ id: vehicle.modelId, label: vehicle.model }))), [makeId, vehicles]);
  const years = useMemo(() => unique(vehicles.filter((vehicle) => vehicle.makeId === makeId && vehicle.modelId === modelId).map((vehicle) => ({ id: vehicle.yearId, label: String(vehicle.year) }))), [makeId, modelId, vehicles]);
  const trims = useMemo(() => unique(vehicles.filter((vehicle) => vehicle.makeId === makeId && vehicle.modelId === modelId && vehicle.yearId === yearId && vehicle.trimId).map((vehicle) => ({ id: vehicle.trimId!, label: vehicle.trim! }))), [makeId, modelId, yearId, vehicles]);
  const engines = useMemo(() => unique(vehicles.filter((vehicle) => vehicle.makeId === makeId && vehicle.modelId === modelId && vehicle.yearId === yearId && (!trimId || vehicle.trimId === trimId) && vehicle.engineId).map((vehicle) => ({ id: vehicle.engineId!, label: vehicle.engine! }))), [makeId, modelId, yearId, trimId, vehicles]);
  const candidates = vehicles.filter((vehicle) =>
    vehicle.makeId === makeId &&
    vehicle.modelId === modelId &&
    vehicle.yearId === yearId &&
    (!trimId || vehicle.trimId === trimId) &&
    (!engineId || vehicle.engineId === engineId),
  );
  const selected = candidates.length === 1 ? candidates[0] : undefined;

  return (
    <fieldset className="rounded-lg border border-stone-200 bg-[#fffdf9] p-5">
      <legend className="flex items-center gap-2 px-1 text-lg font-semibold text-stone-950">
        <CarFront className="size-5 text-primary" aria-hidden="true" />
        Search by vehicle
      </legend>
      <p className="mb-4 mt-1 text-sm text-stone-600">Choose progressively. Fitment is only claimed when one verified configuration is identified.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <select aria-label="Vehicle make" className={selectClass} value={makeId} onChange={(event) => { setMakeId(event.target.value); setModelId(""); setYearId(""); setTrimId(""); setEngineId(""); }}>
          <option value="">Make</option>
          {makes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <select aria-label="Vehicle model" className={selectClass} disabled={!makeId} value={modelId} onChange={(event) => { setModelId(event.target.value); setYearId(""); setTrimId(""); setEngineId(""); }}>
          <option value="">Model</option>
          {models.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <select aria-label="Vehicle year" className={selectClass} disabled={!modelId} value={yearId} onChange={(event) => { setYearId(event.target.value); setTrimId(""); setEngineId(""); }}>
          <option value="">Year</option>
          {years.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <select aria-label="Vehicle trim" className={selectClass} disabled={!yearId || trims.length === 0} value={trimId} onChange={(event) => { setTrimId(event.target.value); setEngineId(""); }}>
          <option value="">Trim</option>
          {trims.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <select aria-label="Vehicle engine" className={selectClass} disabled={!yearId || engines.length === 0} value={engineId} onChange={(event) => setEngineId(event.target.value)}>
          <option value="">Engine</option>
          {engines.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <input name="vehicle" type="hidden" value={selected?.id ?? ""} />
      {selected ? <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-700"><CircleCheck className="size-4" aria-hidden="true" />Verified vehicle selected: {selected.label}</p> : yearId && candidates.length > 1 ? <p className="mt-4 text-sm text-stone-600">Choose a trim or engine to confirm one exact fitment.</p> : null}
    </fieldset>
  );
}
