"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Facet = "fitmentYears" | "fitmentMakes" | "fitmentModels" | "fitmentVariants";

type OptionState = {
  years: string[];
  makes: string[];
  models: string[];
  variants: string[];
  configured: boolean;
};

const emptyOptions: OptionState = {
  years: [],
  makes: [],
  models: [],
  variants: [],
  configured: true,
};

export function VehicleFitmentFinder({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [variant, setVariant] = useState("");
  const [options, setOptions] = useState<OptionState>(emptyOptions);
  const canSubmit = Boolean(year && make && model);

  useEffect(() => {
    void loadFacet("fitmentYears", {}, (values, configured) =>
      setOptions((current) => ({ ...current, years: values, configured })),
    );
  }, []);

  useEffect(() => {
    setMake("");
    setModel("");
    setVariant("");
    if (!year) return;
    void loadFacet("fitmentMakes", { year }, (values, configured) =>
      setOptions((current) => ({
        ...current,
        makes: values,
        models: [],
        variants: [],
        configured,
      })),
    );
  }, [year]);

  useEffect(() => {
    setModel("");
    setVariant("");
    if (!year || !make) return;
    void loadFacet("fitmentModels", { year, make }, (values, configured) =>
      setOptions((current) => ({ ...current, models: values, variants: [], configured })),
    );
  }, [year, make]);

  useEffect(() => {
    setVariant("");
    if (!year || !make || !model) return;
    void loadFacet("fitmentVariants", { year, make, model }, (values, configured) =>
      setOptions((current) => ({ ...current, variants: values, configured })),
    );
  }, [year, make, model]);

  const status = useMemo(() => {
    if (!options.configured) return "Fitment index is not configured.";
    if (!options.years.length) return "No vehicle fitment data found.";
    return "";
  }, [options.configured, options.years.length]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (year) params.set("year", year);
    if (make) params.set("make", make);
    if (model) params.set("model", model);
    if (variant) params.set("variant", variant);
    router.push(`/marketplace?${params.toString()}`);
  }

  function clear() {
    setYear("");
    setMake("");
    setModel("");
    setVariant("");
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "grid gap-3 rounded-md border bg-white p-3 shadow-soft",
        compact
          ? "lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]"
          : "md:grid-cols-[1fr_1fr_1fr_1fr_auto]",
      )}
    >
      <Select label="Year" value={year} onChange={setYear} options={options.years} />
      <Select
        label="Make"
        value={make}
        onChange={setMake}
        options={options.makes}
        disabled={!year}
      />
      <Select
        label="Model"
        value={model}
        onChange={setModel}
        options={options.models}
        disabled={!make}
      />
      <Select
        label="Variant"
        value={variant}
        onChange={setVariant}
        options={options.variants}
        disabled={!model || options.variants.length === 0}
      />
      <Button type="submit" disabled={!canSubmit} className="h-11">
        <Car className="size-4" aria-hidden="true" />
        Fit
      </Button>
      {compact ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={clear}
          aria-label="Clear vehicle"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
      {status ? <p className="text-xs text-muted-foreground md:col-span-full">{status}</p> : null}
    </form>
  );
}

function Select({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border bg-background px-3 text-sm font-medium normal-case tracking-normal text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Any {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

async function loadFacet(
  facet: Facet,
  selection: Record<string, string>,
  onResult: (values: string[], configured: boolean) => void,
) {
  const params = new URLSearchParams({ facet, ...selection });
  const response = await fetch(`/api/fitment/options?${params.toString()}`);

  if (!response.ok) {
    onResult([], false);
    return;
  }

  const body = (await response.json()) as { options?: string[]; configured?: boolean };
  onResult(body.options ?? [], body.configured ?? true);
}
