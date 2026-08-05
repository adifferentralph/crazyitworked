import { Quote } from "lucide-react";

import { SectionHeading } from "@/components/landing/section-heading";

const sourcingNeeds = [
  {
    role: "Workshop owner",
    need: "Faster identification for everyday repair jobs",
  },
  {
    role: "Fleet manager",
    need: "A repeatable way to source across multiple vehicles",
  },
  {
    role: "Parts supplier",
    need: "Clearer enquiries from serious, informed buyers",
  },
] as const;

export function Testimonials() {
  return (
    <section className="bg-white py-20 sm:py-24" aria-labelledby="stories-heading">
      <div className="container-page">
        <div id="stories-heading">
          <SectionHeading
            eyebrow="People we serve"
            title="Designed around real sourcing pressure."
            description="These are the practical outcomes buyers, workshops, fleets, and suppliers come to Twenty-Two Parts to improve."
            align="center"
          />
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {sourcingNeeds.map((item) => (
            <article key={item.role} className="border border-stone-200 bg-[#fffaf5] p-7">
              <Quote className="size-7 text-primary" aria-hidden="true" />
              <p className="mt-8 text-lg font-medium leading-8 text-stone-800">{item.need}</p>
              <div className="mt-8 border-t border-stone-200 pt-5">
                <p className="text-sm font-semibold">{item.role}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Customer perspective
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
