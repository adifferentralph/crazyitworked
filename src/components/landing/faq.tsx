import { ChevronDown } from "lucide-react";

import { SectionHeading } from "@/components/landing/section-heading";

const faqs = [
  {
    question: "What is Twenty-Two Parts?",
    answer:
      "Twenty-Two Parts is a modern marketplace being built to connect automotive parts buyers with trusted suppliers through clearer part and vehicle information.",
  },
  {
    question: "Is it for individual buyers or businesses?",
    answer:
      "Both. The experience is being designed for drivers buying a single replacement part as well as workshops, fleets, and other businesses sourcing repeatedly or in volume.",
  },
  {
    question: "How will I search for a part?",
    answer:
      "The planned marketplace search will support part names, OEM references, vehicle details, and structured categories. Search itself is not part of this landing-page release.",
  },
  {
    question: "Can suppliers join the platform?",
    answer:
      "Supplier onboarding is planned for a later release. The first release establishes the public experience and secure account access.",
  },
  {
    question: "Does Twenty-Two Parts handle payments or delivery?",
    answer:
      "Not in this release. Payments, order workflows, and logistics will be introduced only after the marketplace foundations are ready and separately reviewed.",
  },
  {
    question: "Where will the marketplace operate?",
    answer:
      "The product is being designed around African automotive markets. Launch locations and availability will be announced as supplier coverage is confirmed.",
  },
] as const;

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="container-page grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
        <SectionHeading
          eyebrow="Frequently asked"
          title="Clear answers before the marketplace opens."
          description="The launch is intentionally phased so each capability can be built and reviewed properly."
        />

        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {faqs.map((faq, index) => (
            <details key={faq.question} className="group py-1" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="max-w-2xl pb-6 pr-10 text-sm leading-7 text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
