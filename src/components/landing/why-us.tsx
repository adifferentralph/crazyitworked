import { Check, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const principles = [
  "Part requests structured around compatibility",
  "Supplier context visible before you commit",
  "Retail and business needs handled with equal care",
  "A platform designed for local market realities",
] as const;

export function WhyUs() {
  return (
    <section id="why-us" className="scroll-mt-24 bg-slate-950 py-20 text-white sm:py-24">
      <div className="container-page grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div
            className="absolute inset-0 rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,.35),transparent_45%),linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.02))]"
            aria-hidden="true"
          />
          <div className="absolute inset-8 grid place-items-center rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-2xl">
            <div className="text-center">
              <p className="text-[8rem] font-black leading-none tracking-[-0.12em] text-white sm:text-[10rem]">
                22
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.35em] text-orange-300">
                Parts that fit
              </p>
            </div>
          </div>
          <span className="absolute -bottom-3 -right-3 grid size-20 place-items-center rounded-3xl bg-primary shadow-xl">
            <ShieldCheck className="size-9" aria-hidden="true" />
          </span>
        </div>

        <div>
          <Badge className="border border-orange-300/30 bg-orange-300/10 text-orange-200">
            Why Twenty-Two Parts
          </Badge>
          <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            The spare-parts market should feel less like guesswork.
          </h2>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-slate-300">
            We are building around the information buyers and suppliers actually need: vehicle
            context, reference numbers, condition, availability, quantity, and fulfillment.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {principles.map((principle) => (
              <li
                key={principle}
                className="flex items-start gap-3 text-sm leading-6 text-slate-200"
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-orange-300 text-slate-950">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                {principle}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
