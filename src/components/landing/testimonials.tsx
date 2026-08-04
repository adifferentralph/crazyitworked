import { Quote } from "lucide-react";

import { SectionHeading } from "@/components/landing/section-heading";

const placeholders = [
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
    <section className="bg-orange-50/70 py-20 sm:py-24" aria-labelledby="stories-heading">
      <div className="container-page">
        <div id="stories-heading">
          <SectionHeading
            eyebrow="Launch partner stories"
            title="Real voices will live here—not invented endorsements."
            description="This section is intentionally reserved for verified feedback from the first Twenty-Two Parts users."
            align="center"
          />
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {placeholders.map((item) => (
            <article key={item.role} className="rounded-3xl border border-orange-100 bg-white p-7">
              <Quote className="size-7 text-orange-300" aria-hidden="true" />
              <p className="mt-8 text-lg font-medium leading-8 text-slate-800">{item.need}</p>
              <div className="mt-8 border-t pt-5">
                <p className="text-sm font-semibold">{item.role}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Story reserved
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
