"use client";

import { Analytics } from "@vercel/analytics/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";

import {
  createCookieConsent,
  persistCookieConsent,
  readCookieConsent,
  type CookieConsent,
} from "@/lib/privacy/cookie-consent";

export function CookieConsentManager() {
  const [consent, setConsent] = useState<CookieConsent | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const stored = readCookieConsent();
    if (stored) persistCookieConsent(stored);
    setConsent(stored);

    function handleChange(event: Event) {
      setConsent((event as CustomEvent<CookieConsent>).detail);
    }
    window.addEventListener("ttp:consent-changed", handleChange);
    return () => window.removeEventListener("ttp:consent-changed", handleChange);
  }, []);

  function saveOptional(value: boolean) {
    const next = createCookieConsent({
      analytics: value,
      marketing: value,
      preferences: value,
    });
    persistCookieConsent(next);
    setConsent(next);
  }

  return (
    <>
      {consent?.analytics ? <Analytics /> : null}
      {consent === null ? (
        <aside
          aria-label="Cookie consent"
          className="fixed inset-x-3 bottom-20 z-[60] mx-auto max-w-2xl rounded-xl border border-stone-300 bg-white p-4 shadow-2xl lg:bottom-4"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-stone-950 text-white">
              <Cookie aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="font-body text-base font-bold text-stone-950">
                We use cookies
              </h2>
              <p className="mt-1 text-xs leading-5 text-stone-600 sm:text-sm">
                Essential cookies keep the marketplace and sign-in working.
                With your permission, optional storage may support preferences,
                analytics, and marketing.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="min-h-10 rounded-md bg-primary px-4 text-sm font-bold text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => saveOptional(true)}
              type="button"
            >
              Accept all
            </button>
            <button
              className="min-h-10 rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800 focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => saveOptional(false)}
              type="button"
            >
              Reject optional
            </button>
            <Link
              className="inline-flex min-h-10 items-center px-2 text-sm font-bold text-primary underline-offset-4 focus-visible:underline"
              href="/cookie-preferences"
            >
              Manage preferences
            </Link>
          </div>
        </aside>
      ) : null}
    </>
  );
}
