import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  CheckCircle2,
  Hash,
  Search,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const requestDetails = [
  { icon: CarFront, label: "Vehicle", value: "Year · Make · Model" },
  { icon: Hash, label: "Reference", value: "OEM or part number" },
  { icon: Wrench, label: "Need", value: "Single part or bulk order" },
] as const;

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-slate-950 text-white">
      <div
        className="absolute inset-0 -z-20 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:64px_64px]"
        aria-hidden="true"
      />
      <div
        className="absolute -right-48 -top-40 -z-10 size-[560px] rounded-full bg-orange-500/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-64 left-1/4 -z-10 size-[520px] rounded-full bg-blue-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="container-page grid min-h-[720px] items-center gap-14 py-16 lg:grid-cols-[1.12fr_0.88fr] lg:py-24">
        <div>
          <Badge className="border border-orange-300/30 bg-orange-300/10 text-orange-200">
            Automotive sourcing, re-engineered
          </Badge>
          <h1 className="mt-7 max-w-3xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Find the right part.
            <span className="block text-orange-300">Keep everything moving.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-pretty text-lg leading-8 text-slate-300">
            Twenty-Two Parts brings drivers, workshops, fleets, and trusted suppliers into one
            clearer way to identify and source automotive spare parts.
          </p>

          <form
            id="search"
            role="search"
            action="/#categories"
            method="get"
            className="mt-9 rounded-2xl border border-white/10 bg-white p-2 shadow-2xl shadow-black/25"
          >
            <label htmlFor="part-search" className="sr-only">
              Search by part name, OEM number, or vehicle
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <Input
                  id="part-search"
                  name="part"
                  type="search"
                  placeholder="Part name, OEM number, or vehicle"
                  className="h-14 border-0 bg-transparent pl-12 text-base text-slate-950 placeholder:text-slate-500 focus-visible:ring-0"
                />
              </div>
              <Button type="submit" size="lg" className="h-14 rounded-xl px-6">
                Explore parts
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </form>
          <p className="mt-3 text-sm text-slate-400">
            Catalog search will open with the marketplace launch. Explore the categories below.
          </p>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300">
            {["Retail buyers", "Workshops", "Fleet teams", "Suppliers"].map((audience) => (
              <span key={audience} className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-orange-300" aria-hidden="true" />
                {audience}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:justify-self-end">
          <div
            className="absolute -inset-5 -z-10 rotate-3 rounded-[2rem] border border-white/10 bg-white/5"
            aria-hidden="true"
          />
          <div className="overflow-hidden rounded-[1.75rem] border border-white/15 bg-white text-slate-950 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b bg-slate-50 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Smart part request
                </p>
                <p className="mt-1 font-semibold">Build a precise match</p>
              </div>
              <span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <BadgeCheck className="size-5" aria-hidden="true" />
              </span>
            </div>

            <div className="grid gap-3 p-6">
              {requestDetails.map((detail, index) => (
                <div
                  key={detail.label}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white">
                    <detail.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {detail.label}
                    </p>
                    <p className="mt-1 truncate font-medium">{detail.value}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">0{index + 1}</span>
                </div>
              ))}
            </div>

            <div className="border-t bg-orange-50 px-6 py-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm leading-6 text-slate-700">
                  Compatibility details and supplier context stay attached to every request.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="#how-it-works"
            className="mx-auto mt-6 flex w-fit items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white lg:mx-0"
          >
            See how sourcing works
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
