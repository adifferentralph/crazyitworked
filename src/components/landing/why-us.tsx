import Image from "next/image";
import { Check, ShieldCheck } from "lucide-react";

import logo from "@/components/brand/logo.png";
import { Badge } from "@/components/ui/badge";

const principles = [
  "Part requests structured around compatibility",
  "Supplier context visible before you commit",
  "Retail and business needs handled with equal care",
  "A platform designed for local market realities",
] as const;

export function WhyUs() {
  return (
    <section id="why-us" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="container-page grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative mx-auto aspect-square w-full max-w-md border border-stone-200 bg-[#fffaf5] p-8">
          <div className="grid size-full place-items-center border border-stone-200 bg-white">
            <Image
              src={logo}
              alt="Twenty-Two Parts"
              className="h-auto w-3/4 object-contain"
              sizes="(min-width: 1024px) 320px, 70vw"
            />
          </div>
          <span className="absolute -bottom-3 -right-3 grid size-20 place-items-center bg-primary text-white shadow-xl">
            <ShieldCheck className="size-9" aria-hidden="true" />
          </span>
        </div>

        <div>
          <Badge className="border border-primary/20 bg-white text-primary">
            Why Twenty-Two Parts
          </Badge>
          <h2 className="mt-5 text-balance font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            The spare-parts market should feel less like guesswork.
          </h2>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
            We keep the information buyers and suppliers actually need close at hand: vehicle
            context, reference numbers, condition, availability, quantity, and fulfillment.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {principles.map((principle) => (
              <li
                key={principle}
                className="flex items-start gap-3 text-sm leading-6 text-stone-700"
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center bg-primary text-white">
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
