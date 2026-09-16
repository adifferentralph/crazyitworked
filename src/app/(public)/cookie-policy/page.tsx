import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  description: "How Twenty-Two Parts uses cookies and browser storage.",
  title: "Cookie Policy",
};

export default function CookiePolicyPage() {
  return (
    <article className="bg-white py-8 font-body sm:py-12">
      <div className="container-page max-w-3xl">
        <h1 className="font-body text-3xl font-bold text-stone-950">Cookie Policy</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          This policy explains the cookies and browser storage used on
          twentytwoparts.com and vendors.twentytwoparts.com.
        </p>

        <div className="mt-8 grid gap-8 text-sm leading-7 text-stone-700">
          <section>
            <h2 className="font-body text-xl font-bold text-stone-950">Essential</h2>
            <p className="mt-2">
              Supabase authentication uses secure session cookies to keep signed-in
              buyers, suppliers, and administrators authenticated and to refresh
              valid sessions. These are required for private account features and
              are not controlled by optional marketing consent.
            </p>
          </section>
          <section>
            <h2 className="font-body text-xl font-bold text-stone-950">Preferences</h2>
            <p className="mt-2">
              With preference consent, local storage remembers optional interface
              decisions such as dismissing the install-app suggestion. That
              dismissal expires after 30 days. The consent record remains until
              you clear browser data or the consent version changes.
            </p>
          </section>
          <section>
            <h2 className="font-body text-xl font-bold text-stone-950">Analytics</h2>
            <p className="mt-2">
              Vercel Analytics and privacy-conscious marketplace demand events load
              only after analytics consent. Demand events use session storage to
              avoid duplicate reports during the current browser session.
            </p>
          </section>
          <section>
            <h2 className="font-body text-xl font-bold text-stone-950">Marketing</h2>
            <p className="mt-2">
              No optional marketing tracker is currently loaded by the website.
              Your marketing choice is stored separately so a future integration
              cannot be enabled without an affirmative preference and an updated
              disclosure where required.
            </p>
          </section>
          <section>
            <h2 className="font-body text-xl font-bold text-stone-950">Service providers</h2>
            <p className="mt-2">
              Supabase provides authentication and database services. Vercel hosts
              the application and provides analytics only when enabled. Their own
              systems may process technical request information according to their
              published terms.
            </p>
          </section>
          <section>
            <h2 className="font-body text-xl font-bold text-stone-950">Change your choice</h2>
            <p className="mt-2">
              Open{" "}
              <Link className="font-bold text-primary underline" href="/cookie-preferences">
                Cookie preferences
              </Link>{" "}
              at any time. You may also clear browser storage; the consent prompt
              will be shown again.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
