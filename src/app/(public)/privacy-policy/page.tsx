import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Twenty-Two Parts collects, uses, protects, and shares personal information.",
};

const sections = [
  {
    title: "Information we collect",
    content: (
      <>
        <p>
          We collect information you provide when you create or use an account, including your name,
          email address, account type, and authentication information. Supplier accounts may also
          provide a store name, business details, contact information, location, verification
          information, product listings, inventory, vehicle fitment data, and product images.
        </p>
        <p>
          We may also collect security and technical information such as session data, browser and
          device information, IP address, and basic usage events needed to operate, protect, and
          improve the service. Passwords are handled by our authentication provider and are not
          stored in readable form by Twenty-Two Parts.
        </p>
      </>
    ),
  },
  {
    title: "How we use information",
    content: (
      <p>
        We use personal information to create and secure accounts, authenticate users, provide
        marketplace search and supplier tools, review supplier and listing information, prevent
        abuse, respond to support requests, maintain records, comply with legal obligations, and
        improve the reliability and usability of Twenty-Two Parts.
      </p>
    ),
  },
  {
    title: "Legal reasons for processing",
    content: (
      <p>
        Depending on the activity, we process information to perform our agreement with you, comply
        with legal obligations, protect our legitimate interests in operating a safe marketplace, or
        act with your consent where consent is required. You may withdraw consent for future
        processing where consent is the applicable basis.
      </p>
    ),
  },
  {
    title: "How information is shared",
    content: (
      <>
        <p>
          We share information only as needed with service providers that support authentication,
          database hosting, file storage, transactional email, analytics, security, and application
          hosting, or when disclosure is required by law. These providers process information for
          the services they supply to us.
        </p>
        <p>
          Approved marketplace listings are public. They may display supplier store information,
          general business location, verification status, product information, vehicle fitment,
          price, inventory availability, and marketplace-facing product images. We do not publish
          account passwords or private authentication credentials.
        </p>
      </>
    ),
  },
  {
    title: "Storage, retention, and security",
    content: (
      <p>
        We use reasonable administrative and technical safeguards designed to protect personal
        information. We keep information for as long as needed to provide the service, maintain
        security and business records, resolve disputes, and satisfy legal requirements. No online
        system is completely risk-free, so please use a unique password and protect your sign-in
        details.
      </p>
    ),
  },
  {
    title: "International processing",
    content: (
      <p>
        Some service providers may process information outside Nigeria. Where this occurs, we take
        steps intended to ensure an appropriate level of protection and use lawful transfer
        safeguards required by applicable data-protection law.
      </p>
    ),
  },
  {
    title: "Your privacy rights",
    content: (
      <>
        <p>
          Subject to applicable law, you may ask to access, correct, delete, restrict, or receive a
          copy of your personal information, object to certain processing, withdraw consent, and
          raise a complaint with the Nigeria Data Protection Commission. Some requests may be
          limited where we must retain information for security or legal reasons.
        </p>
        <p>
          To make a request, use a verified Twenty-Two Parts support channel and state that your
          request concerns privacy. We may ask for information needed to confirm your identity
          before acting on the request. You can also learn more from the{" "}
          <Link
            className="font-semibold text-primary underline underline-offset-4"
            href="https://www.ndpc.gov.ng/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Nigeria Data Protection Commission
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    title: "Changes to this policy",
    content: (
      <p>
        We may update this policy when the service, our providers, or legal requirements change. We
        will publish the revised date here and provide additional notice when a change materially
        affects how we use personal information.
      </p>
    ),
  },
] as const;

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-stone-50">
      <section className="border-b border-stone-200 bg-white">
        <div className="container-page py-14 sm:py-20">
          <div className="flex size-11 items-center justify-center rounded-full bg-orange-100 text-stone-950">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Legal and privacy
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
            Privacy Policy
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
            This policy explains how Twenty-Two Parts handles personal information when you browse
            the marketplace, create an account, or use supplier tools.
          </p>
          <p className="mt-4 font-mono text-xs text-stone-500">Last updated: 21 August 2026</p>
        </div>
      </section>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[15rem_minmax(0,48rem)] lg:justify-between lg:py-16">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-sm font-semibold text-stone-950">In this policy</p>
          <nav aria-label="Privacy policy sections" className="mt-4">
            <ol className="grid gap-2 text-sm text-stone-600">
              {sections.map((section, index) => (
                <li key={section.title}>
                  <a className="hover:text-primary" href={`#section-${index + 1}`}>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="rounded-2xl border border-stone-200 bg-white px-5 py-8 shadow-sm sm:px-9 sm:py-10">
          <div className="space-y-10">
            {sections.map((section, index) => (
              <section className="scroll-mt-28" id={`section-${index + 1}`} key={section.title}>
                <h2 className="font-display text-2xl font-semibold text-stone-950">
                  {index + 1}. {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-sm leading-7 text-stone-600 sm:text-base sm:leading-8">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
