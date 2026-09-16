import type { Metadata } from "next";
import Link from "next/link";

import { CookiePreferencesForm } from "@/components/privacy/cookie-preferences-form";

export const metadata: Metadata = {
  description: "Choose how Twenty-Two Parts uses optional browser storage and analytics.",
  title: "Cookie preferences",
};

export default function CookiePreferencesPage() {
  return (
    <section className="min-h-[70vh] bg-stone-50 py-8 font-body sm:py-12">
      <div className="container-page max-w-3xl">
        <h1 className="font-body text-3xl font-bold text-stone-950">
          Cookie preferences
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Essential storage remains available for sign-in and core marketplace
          operation. You can change optional preferences at any time.
        </p>
        <div className="mt-7">
          <CookiePreferencesForm />
        </div>
        <p className="mt-6 text-sm text-stone-600">
          Read the{" "}
          <Link className="font-bold text-primary underline" href="/cookie-policy">
            Cookie Policy
          </Link>{" "}
          for more detail.
        </p>
      </div>
    </section>
  );
}
