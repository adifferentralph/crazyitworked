import { BadgeCheck, ClipboardList, PackageCheck } from "lucide-react";

import { SectionHeading } from "@/components/landing/section-heading";

const steps = [
  {
    icon: ClipboardList,
    title: "Describe the part",
    description:
      "Search by name, OEM reference, or vehicle details. Add the context that removes guesswork.",
  },
  {
    icon: BadgeCheck,
    title: "Review the match",
    description:
      "Compare compatible options, supplier information, condition, availability, and location.",
  },
  {
    icon: PackageCheck,
    title: "Choose with confidence",
    description:
      "Move forward with one shared understanding of the part, quantity, and fulfillment need.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-[#fffaf5] py-20 sm:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="How it works"
          title="From an uncertain request to a confident match."
          description="Twenty-Two Parts makes a fragmented sourcing process feel structured and straightforward."
          align="center"
        />

        <ol className="mt-12 grid gap-5 lg:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative overflow-hidden border bg-white p-7 shadow-soft"
            >
              <span className="absolute right-5 top-4 font-mono text-6xl font-bold text-stone-100">
                {index + 1}
              </span>
              <span className="relative grid size-12 place-items-center bg-primary text-white">
                <step.icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="relative mt-8 text-xl font-semibold">{step.title}</h3>
              <p className="relative mt-3 text-sm leading-7 text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
