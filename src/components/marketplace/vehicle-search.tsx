"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleCheck } from "lucide-react";

import type {
  MarketplaceVehicleMakeOption,
  MarketplaceVehicleOption,
} from "@/lib/marketplace/search-options";

const selectClass =
  "h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function unique<T extends { id: string; label: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function isMakeOption(value: unknown): value is MarketplaceVehicleMakeOption {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "label" in value &&
    typeof value.label === "string" &&
    "isDiscontinued" in value &&
    typeof value.isDiscontinued === "boolean" &&
    "originCountry" in value &&
    (typeof value.originCountry === "string" || value.originCountry === null)
  );
}

export function VehicleSearch({
  initialVehicle,
  makes,
  vehicles,
}: {
  initialVehicle?: string;
  makes: MarketplaceVehicleMakeOption[];
  vehicles: MarketplaceVehicleOption[];
}) {
  const initial = vehicles.find((vehicle) => vehicle.id === initialVehicle);
  const [makeId, setMakeId] = useState(initial?.makeId ?? "");
  const [makeQuery, setMakeQuery] = useState(initial?.make ?? "");
  const [modelId, setModelId] = useState(initial?.modelId ?? "");
  const [yearId, setYearId] = useState(initial?.yearId ?? "");
  const [trimId, setTrimId] = useState(initial?.trimId ?? "");
  const [engineId, setEngineId] = useState(initial?.engineId ?? "");
  const [makeOpen, setMakeOpen] = useState(false);
  const [highlightedMake, setHighlightedMake] = useState(0);
  const [makeOptions, setMakeOptions] = useState(makes);
  const [makeLoading, setMakeLoading] = useState(false);

  useEffect(() => {
    if (makeId) return;
    const query = makeQuery.trim();
    if (query.length < 2) {
      setMakeOptions(makes);
      setMakeLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setMakeLoading(true);
      try {
        const response = await fetch(
          "/api/vehicles/makes?q=" + encodeURIComponent(query),
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (
          typeof payload === "object" &&
          payload !== null &&
          "makes" in payload &&
          Array.isArray(payload.makes)
        ) {
          setMakeOptions(payload.makes.filter(isMakeOption));
        }
      } finally {
        if (!controller.signal.aborted) setMakeLoading(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [makeId, makeQuery, makes]);

  const filteredMakes = useMemo(() => {
    const query = makeQuery.trim().toLocaleLowerCase();
    return makeOptions
      .filter((make) => !query || make.label.toLocaleLowerCase().includes(query))
      .slice(0, 12);
  }, [makeOptions, makeQuery]);

  const models = useMemo(
    () =>
      unique(
        vehicles
          .filter((vehicle) => vehicle.makeId === makeId)
          .map((vehicle) => ({ id: vehicle.modelId, label: vehicle.model })),
      ),
    [makeId, vehicles],
  );
  const years = useMemo(
    () =>
      unique(
        vehicles
          .filter(
            (vehicle) =>
              vehicle.makeId === makeId && vehicle.modelId === modelId,
          )
          .map((vehicle) => ({
            id: vehicle.yearId,
            label: String(vehicle.year),
          })),
      ),
    [makeId, modelId, vehicles],
  );
  const trims = useMemo(
    () =>
      unique(
        vehicles
          .filter(
            (vehicle) =>
              vehicle.makeId === makeId &&
              vehicle.modelId === modelId &&
              vehicle.yearId === yearId &&
              vehicle.trimId,
          )
          .map((vehicle) => ({
            id: vehicle.trimId!,
            label: vehicle.trim!,
          })),
      ),
    [makeId, modelId, yearId, vehicles],
  );
  const engines = useMemo(
    () =>
      unique(
        vehicles
          .filter(
            (vehicle) =>
              vehicle.makeId === makeId &&
              vehicle.modelId === modelId &&
              vehicle.yearId === yearId &&
              (!trimId || vehicle.trimId === trimId) &&
              vehicle.engineId,
          )
          .map((vehicle) => ({
            id: vehicle.engineId!,
            label: vehicle.engine!,
          })),
      ),
    [makeId, modelId, trimId, vehicles, yearId],
  );
  const candidates = vehicles.filter(
    (vehicle) =>
      vehicle.makeId === makeId &&
      vehicle.modelId === modelId &&
      vehicle.yearId === yearId &&
      (!trimId || vehicle.trimId === trimId) &&
      (!engineId || vehicle.engineId === engineId),
  );
  const selected = candidates.length === 1 ? candidates[0] : undefined;

  function clearAfterMake() {
    setModelId("");
    setYearId("");
    setTrimId("");
    setEngineId("");
  }

  function selectMake(make: MarketplaceVehicleMakeOption) {
    setMakeId(make.id);
    setMakeQuery(make.label);
    clearAfterMake();
    setMakeOpen(false);
  }

  return (
    <fieldset>
      <legend className="sr-only">Choose your vehicle</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <label className="mb-1.5 block text-xs font-bold text-stone-700" htmlFor="vehicle-make-search">
            Make
          </label>
          <input
            aria-activedescendant={
              makeOpen && filteredMakes[highlightedMake]
                ? `vehicle-make-${filteredMakes[highlightedMake].id}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls="vehicle-make-options"
            aria-expanded={makeOpen}
            autoComplete="off"
            className={selectClass}
            id="vehicle-make-search"
            onBlur={() => window.setTimeout(() => setMakeOpen(false), 100)}
            onChange={(event) => {
              setMakeQuery(event.target.value);
              setMakeId("");
              clearAfterMake();
              setHighlightedMake(0);
              setMakeOpen(true);
            }}
            onFocus={() => setMakeOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setMakeOpen(true);
                setHighlightedMake((current) =>
                  Math.min(current + 1, filteredMakes.length - 1),
                );
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlightedMake((current) => Math.max(0, current - 1));
              } else if (event.key === "Enter" && makeOpen) {
                const make = filteredMakes[highlightedMake];
                if (make) {
                  event.preventDefault();
                  selectMake(make);
                }
              } else if (event.key === "Escape") {
                setMakeOpen(false);
              }
            }}
            placeholder="Search make..."
            role="combobox"
            type="search"
            value={makeQuery}
          />
          {makeOpen ? (
            <div
              className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-stone-200 bg-white p-1 shadow-xl"
              id="vehicle-make-options"
              role="listbox"
            >
              {filteredMakes.length > 0 ? (
                filteredMakes.map((make, index) => (
                  <button
                    aria-selected={make.id === makeId}
                    className={`flex min-h-10 w-full items-center justify-between rounded px-3 text-left text-sm ${index === highlightedMake ? "bg-stone-100 text-stone-950" : "text-stone-700"}`}
                    id={`vehicle-make-${make.id}`}
                    key={make.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectMake(make)}
                    role="option"
                    tabIndex={-1}
                    type="button"
                  >
                    <span>{make.label}</span>
                    {make.isDiscontinued ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                        Historic
                      </span>
                    ) : null}
                  </button>
                ))
              ) : (
                <p className="px-3 py-3 text-sm text-stone-500">
                  {makeLoading ? "Searching makes..." : "No make found."}
                </p>
              )}
            </div>
          ) : null}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-stone-700">Model</span>
          <select
            aria-label="Vehicle model"
            className={selectClass}
            disabled={!makeId || models.length === 0}
            onChange={(event) => {
              setModelId(event.target.value);
              setYearId("");
              setTrimId("");
              setEngineId("");
            }}
            value={modelId}
          >
            <option value="">Model</option>
            {models.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-stone-700">Year</span>
          <select
            aria-label="Vehicle year"
            className={selectClass}
            disabled={!modelId}
            onChange={(event) => {
              setYearId(event.target.value);
              setTrimId("");
              setEngineId("");
            }}
            value={yearId}
          >
            <option value="">Year</option>
            {years.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>

        {yearId && trims.length > 0 ? (
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-stone-700">Trim</span>
            <select
              aria-label="Vehicle trim"
              className={selectClass}
              onChange={(event) => {
                setTrimId(event.target.value);
                setEngineId("");
              }}
              value={trimId}
            >
              <option value="">Any trim</option>
              {trims.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        ) : null}

        {yearId && engines.length > 0 ? (
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-stone-700">Engine</span>
            <select
              aria-label="Vehicle engine"
              className={selectClass}
              onChange={(event) => setEngineId(event.target.value)}
              value={engineId}
            >
              <option value="">Any engine</option>
              {engines.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <input name="vehicle" type="hidden" value={selected?.id ?? ""} />
      {makeId && models.length === 0 ? (
        <p className="mt-3 text-xs text-stone-500">
          Model-level fitment data for this make is not available yet.
        </p>
      ) : null}
      {selected ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CircleCheck aria-hidden="true" className="size-4" />
          {selected.label}
        </p>
      ) : yearId && candidates.length > 1 ? (
        <p className="mt-3 text-sm text-stone-600">
          Choose a trim or engine to narrow the match.
        </p>
      ) : null}
    </fieldset>
  );
}
