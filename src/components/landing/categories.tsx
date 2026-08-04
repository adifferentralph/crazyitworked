import {
  Armchair,
  BatteryCharging,
  CircleGauge,
  Disc3,
  Gauge,
  Lightbulb,
  Settings,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { SectionHeading } from "@/components/landing/section-heading";
import { categories } from "@/lib/marketplace/taxonomy";

const categoryIcons: Record<(typeof categories)[number]["slug"], LucideIcon> = {
  engine: Settings,
  transmission: Gauge,
  suspension: Wrench,
  "brake-system": Disc3,
  electrical: BatteryCharging,
  "body-parts": Lightbulb,
  "tyres-wheels": CircleGauge,
  interior: Armchair,
};

export function Categories() {
  return (
    <section id="categories" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="Browse categories"
          title="Start with the system. Narrow down to the exact part."
          description="A clean category structure makes it easier to describe what you need—even when you do not have the part number yet."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category, index) => {
            const Icon = categoryIcons[category.slug];

            return (
              <a
                key={category.slug}
                href="#search"
                className="group rounded-2xl border border-slate-200 bg-background p-5 transition duration-200 hover:-translate-y-1 hover:border-orange-200 hover:bg-orange-50/60 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-slate-950 text-white transition-colors group-hover:bg-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-slate-300">0{index + 1}</span>
                </div>
                <h3 className="mt-6 font-semibold">{category.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {category.description}
                </p>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
