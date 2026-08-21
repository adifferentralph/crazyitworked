import { Categories } from "@/components/landing/categories";
import { FAQ } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";
import { WhyUs } from "@/components/landing/why-us";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Categories />
      <HowItWorks />
      <WhyUs />
      <Features />
      <Testimonials />
      <FAQ />
    </>
  );
}
