"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { CircleCheck } from "lucide-react";

import type {
  MarketplaceVehicleMakeOption,
  MarketplaceVehicleOption,
} from "@/lib/marketplace/search-options";

const selectClass =
  "h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

type NamedOption = { id: string; name: string };
type YearOption = { id: string; year: number };
type FitmentDetail = {
  engine: string | null;
  engineId: string | null;
  id: string;
  trim: string | null;
  trimId: string | null;
};

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

function isNamedOption(value: unknown): value is NamedOption {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string"
  );
}

function isYearOption(value: unknown): value is YearOption {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "year" in value &&
    typeof value.year === "number"
  );
}

function isFitmentDetail(value: unknown): value is FitmentDetail {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "trimId" in value &&
    (typeof value.trimId === "string" || value.trimId === null) &&
    "trim" in value &&
    (typeof value.trim === "string" || value.trim === null) &&
    "engineId" in value &&
    (typeof value.engineId === "string" || value.engineId === null) &&
    "engine" in value &&
    (typeof value.engine === "string" || value.engine === null)
  );
}

function isVehicleOption(value: unknown): value is MarketplaceVehicleOption {
  return (
    isFitmentDetail(value) &&
    "label" in value &&
    typeof value.label === "string" &&
    "make" in value &&
    typeof value.make === "string" &&
    "makeId" in value &&
    typeof value.makeId === "string" &&
    "model" in value &&
    typeof value.model === "string" &&
    "modelId" in value &&
    typeof value.modelId === "string" &&
    "year" in value &&
    typeof value.year === "number" &&
    "yearId" in value &&
    typeof value.yearId === "string"
  );
}

export function VehicleSearch({
  initialVehicle,
  inputName = "vehicle",
  makes,
  vehicles,
}: {
  initialVehicle?: string;
  inputName?: string;
  makes: MarketplaceVehicleMakeOption[];
  vehicles: MarketplaceVehicleOption[];
}) {
  const instanceId = useId().replaceAll(":", "");
  const makeInputId = `${instanceId}-make-search`;
  const makeListId = `${instanceId}-make-options`;
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
  const [modelOptions, setModelOptions] = useState<NamedOption[]>(
    initial ? [{ id: initial.modelId, name: initial.model }] : [],
  );
  const [yearOptions, setYearOptions] = useState<YearOption[]>(
    initial ? [{ id: initial.yearId, year: initial.year }] : [],
  );
  const [fitmentOptions, setFitmentOptions] = useState<FitmentDetail[]>(
    initial
      ? [{
          engine: initial.engine,
          engineId: initial.engineId,
          id: initial.id,
          trim: initial.trim,
          trimId: initial.trimId,
        }]
      : [],
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialVehicle || initial) return;
    const controller = new AbortController();
    void fetch(
      "/api/vehicles/options?fitmentId=" + encodeURIComponent(initialVehicle),
      { signal: controller.signal },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("fitment" in payload) ||
          !isVehicleOption(payload.fitment)
        ) {
          return;
        }
        const fitment = payload.fitment;
        setMakeId(fitment.makeId);
        setMakeQuery(fitment.make);
        setModelId(fitment.modelId);
        setYearId(fitment.yearId);
        setTrimId(fitment.trimId ?? "");
        setEngineId(fitment.engineId ?? "");
        setModelOptions([{ id: fitment.modelId, name: fitment.model }]);
        setYearOptions([{ id: fitment.yearId, year: fitment.year }]);
        setFitmentOptions([fitment]);
        const make = "make" in payload ? payload.make : null;
        if (isMakeOption(make)) {
          setMakeOptions((current) => [
            make,
            ...current.filter((option) => option.id !== make.id),
          ]);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [initial, initialVehicle]);

  useEffect(() => {
    if (!makeId) {
      setModelOptions([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void fetch("/api/vehicles/options?makeId=" + encodeURIComponent(makeId), {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (
          typeof payload === "object" &&
          payload !== null &&
          "models" in payload &&
          Array.isArray(payload.models)
        ) {
          setModelOptions(payload.models.filter(isNamedOption));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [makeId]);

  useEffect(() => {
    if (!modelId) {
      setYearOptions([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void fetch("/api/vehicles/options?modelId=" + encodeURIComponent(modelId), {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (
          typeof payload === "object" &&
          payload !== null &&
          "years" in payload &&
          Array.isArray(payload.years)
        ) {
          setYearOptions(payload.years.filter(isYearOption));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [modelId]);

  useEffect(() => {
    if (!yearId) {
      setFitmentOptions([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void fetch("/api/vehicles/options?yearId=" + encodeURIComponent(yearId), {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (
          typeof payload === "object" &&
          payload !== null &&
          "fitments" in payload &&
          Array.isArray(payload.fitments)
        ) {
          setFitmentOptions(payload.fitments.filter(isFitmentDetail));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [yearId]);

  useEffect(() => {
    if (makeId) return;
    const query = makeQuery.trim();
    if (query.length < 2) {
      setMakeOptions(makes);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      void fetch("/api/vehicles/makes?q=" + encodeURIComponent(query), {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: unknown) => {
          if (
            typeof payload === "object" &&
            payload !== null &&
            "makes" in payload &&
            Array.isArray(payload.makes)
          ) {
            setMakeOptions(payload.makes.filter(isMakeOption));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [makeId, makeQuery, makes]);

  const filteredMakes = useMemo(() => {
    const query = makeQuery.trim().toLocaleLowerCase();
    return makeOptions
      .filter((make) => !query || make.label.toLocaleLowerCase().includes(query))
      .slice(0, 20);
  }, [makeOptions, makeQuery]);

  const trims = useMemo(
    () => [
      ...new Map(
        fitmentOptions.flatMap((fitment) =>
          fitment.trimId && fitment.trim
            ? [[fitment.trimId, { id: fitment.trimId, name: fitment.trim }] as const]
            : [],
        ),
      ).values(),
    ],
    [fitmentOptions],
  );
  const engines = useMemo(
    () => [
      ...new Map(
        fitmentOptions
          .filter((fitment) => !trimId || fitment.trimId === trimId)
          .flatMap((fitment) =>
            fitment.engineId && fitment.engine
              ? [[fitment.engineId, { id: fitment.engineId, name: fitment.engine }] as const]
              : [],
          ),
      ).values(),
    ],
    [fitmentOptions, trimId],
  );
  const selected =
    fitmentOptions.find(
      (fitment) =>
        fitment.trimId === (trimId || null) &&
        fitment.engineId === (engineId || null),
    ) ??
    fitmentOptions.find(
      (fitment) =>
        (!trimId || fitment.trimId === trimId) &&
        (!engineId || fitment.engineId === engineId),
    );

  function clearAfterMake() {
    setModelId("");
    setYearId("");
    setTrimId("");
    setEngineId("");
    setYearOptions([]);
    setFitmentOptions([]);
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
          <label className="mb-1.5 block text-xs font-bold text-stone-700" htmlFor={makeInputId}>
            Make
          </label>
          <input
            aria-activedescendant={
              makeOpen && filteredMakes[highlightedMake]
                ? `${instanceId}-make-${filteredMakes[highlightedMake].id}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={makeListId}
            aria-expanded={makeOpen}
            autoComplete="off"
            className={selectClass}
            id={makeInputId}
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
                  Math.min(current + 1, Math.max(0, filteredMakes.length - 1)),
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
              id={makeListId}
              role="listbox"
            >
              {filteredMakes.length > 0 ? (
                filteredMakes.map((make, index) => (
                  <button
                    aria-selected={make.id === makeId}
                    className={`flex min-h-10 w-full items-center justify-between rounded px-3 text-left text-sm ${index === highlightedMake ? "bg-stone-100 text-stone-950" : "text-stone-700"}`}
                    id={`${instanceId}-make-${make.id}`}
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
                  {loading ? "Searching makes..." : "No make found."}
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
            disabled={!makeId || modelOptions.length === 0}
            onChange={(event) => {
              setModelId(event.target.value);
              setYearId("");
              setTrimId("");
              setEngineId("");
              setFitmentOptions([]);
            }}
            value={modelId}
          >
            <option value="">{loading && makeId ? "Loading models..." : "Model"}</option>
            {modelOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-stone-700">Year</span>
          <select
            aria-label="Vehicle year"
            className={selectClass}
            disabled={!modelId || yearOptions.length === 0}
            onChange={(event) => {
              setYearId(event.target.value);
              setTrimId("");
              setEngineId("");
            }}
            value={yearId}
          >
            <option value="">{loading && modelId ? "Loading years..." : "Year"}</option>
            {yearOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.year}</option>
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
                <option key={item.id} value={item.id}>{item.name}</option>
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
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <input name={inputName} type="hidden" value={selected?.id ?? ""} />
      {makeId && !loading && modelOptions.length === 0 ? (
        <p className="mt-3 text-xs text-stone-500">
          We do not have models for this make yet. Try another spelling or make.
        </p>
      ) : null}
      {selected ? (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CircleCheck aria-hidden="true" className="size-4" />
          Vehicle selected
        </p>
      ) : null}
    </fieldset>
  );
}
