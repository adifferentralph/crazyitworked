import { ChevronDown } from "lucide-react";

import { SectionHeading } from "@/components/landing/section-heading";

const faqs = [
  {
    question: "What is Twenty-Two Parts?",
    answer:
      "Twenty-Two Parts is a modern marketplace that connects automotive parts buyers with trusted suppliers through clearer part and vehicle information.",
  },
  {
    question: "Is it for individual buyers or businesses?",
    answer:
      "Both. Drivers can source a single replacement part, while workshops, fleets, and other businesses can handle repeat and volume requirements.",
  },
  {
    question: "How do I search for a part?",
    answer:
      "Start with a part name, OEM reference, vehicle details, or a structured category. Adding more vehicle context helps suppliers understand the exact fit you need.",
  },
  {
    question: "Can suppliers join the platform?",
    answer:
      "Yes. Suppliers and vendors use a dedicated account path so business details and buyer access remain clearly separated.",
  },
  {
    question: "Does Twenty-Two Parts handle payments or delivery?",
    answer:
      "Twenty-Two Parts currently focuses on part discovery and supplier connections. Buyers and suppliers agree payment and delivery terms directly.",
  },
  {
    question: "Where does the marketplace operate?",
    answer:
      "Twenty-Two Parts is designed for African automotive markets. Available parts and fulfillment options depend on active supplier coverage in each location.",
  },
] as const;

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-24 bg-[#fffdf9] py-20 sm:py-24">
      <div className="container-page grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
        <SectionHeading
          eyebrow="Frequently asked"
          title="Straight answers for buyers and suppliers."
          description="What to know before creating an account or starting a part request."
        />

        <div className="divide-y divide-stone-200 border-y border-stone-200">
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
