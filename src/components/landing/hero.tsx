import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Search, Store } from "lucide-react";

import heroWorkshop from "@/components/brand/hero-workshop.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";

const audiences = ["Retail buyers", "Workshops", "Fleet teams", "Parts suppliers"] as const;

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-white">
      <Image
        src={heroWorkshop}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[68%_center]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 -z-10 bg-black/25" aria-hidden="true" />

      <div className="container-page flex min-h-[720px] items-center py-12 sm:py-16 lg:py-20">
        <div className="w-full max-w-2xl border-l-4 border-primary bg-white p-6 shadow-2xl sm:p-10 lg:p-12">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <span className="size-2 bg-primary" aria-hidden="true" />
            Automotive sourcing, made clearer
          </p>
          <h1 className="mt-6 max-w-xl text-balance font-display text-5xl font-semibold leading-[1.02] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-7xl">
            Source the exact part you need. <span className="text-primary">Keep moving.</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
            Twenty-Two Parts connects drivers, workshops, fleets, and trusted suppliers through a
            simpler way to identify and source automotive spare parts.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-lg px-6">
              <Link href={siteConfig.auth.buyers}>
                Find a part
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-lg px-6">
              <Link href={siteConfig.auth.suppliers}>
                <Store className="size-4" aria-hidden="true" />
                For suppliers
              </Link>
            </Button>
          </div>

          <form
            id="search"
            role="search"
            action={siteConfig.auth.buyers}
            method="get"
            className="mt-8 border border-stone-200 bg-[#fffaf5] p-2"
          >
            <label htmlFor="part-search" className="sr-only">
              Search by part name, OEM number, or vehicle
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-stone-500"
                  aria-hidden="true"
                />
                <Input
                  id="part-search"
                  name="part"
                  type="search"
                  placeholder="Part name, OEM number, or vehicle"
                  className="h-14 border-0 bg-white pl-12 text-base focus-visible:ring-1"
                />
              </div>
              <Button type="submit" size="lg" className="h-14 rounded-md px-6">
                Explore parts
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </form>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in or create an account to save vehicle details and start a precise part request.
          </p>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-sm text-stone-700">
            {audiences.map((audience) => (
              <span key={audience} className="inline-flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                {audience}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
