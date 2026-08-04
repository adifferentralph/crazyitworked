import { Boxes, Building2, CarFront, MapPinned, ScanSearch, ShieldCheck } from "lucide-react";

import { SectionHeading } from "@/components/landing/section-heading";

const features = [
  {
    icon: ScanSearch,
    title: "Reference-led discovery",
    description: "Start with a part name, OEM number, or the information already on hand.",
  },
  {
    icon: CarFront,
    title: "Vehicle-aware requests",
    description: "Capture year, make, model, and variant so fitment stays central.",
  },
  {
    icon: ShieldCheck,
    title: "Supplier confidence",
    description: "Create a clearer path toward verified business and listing information.",
  },
  {
    icon: Boxes,
    title: "Retail and bulk",
    description: "Support one-off repairs, workshop demand, and recurring fleet requirements.",
  },
  {
    icon: MapPinned,
    title: "Local fulfillment context",
    description: "Make location and delivery expectations part of the sourcing decision.",
  },
  {
    icon: Building2,
    title: "Built for professionals",
    description: "Give workshops and fleet teams a process designed for repeatable sourcing.",
  },
] as const;

export function Features() {
  return (
    <section id="features" className="scroll-mt-24 py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="Purpose-built"
          title="A better foundation for every parts decision."
          description="The first release focuses on helping people understand what Twenty-Two Parts will make simpler."
        />

        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="border-t border-slate-300 pt-5">
              <feature.icon className="size-6 text-primary" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
