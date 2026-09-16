import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { BrandLogo } from "@/components/brand/brand-logo";
import { getSocialProviderAvailability } from "@/lib/auth/providers";
import { getSafeRedirect } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  description: "Sign in to manage your Twenty-Two Parts supplier account.",
  title: "Supplier sign in",
};

export default async function VendorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; next?: string }>;
}) {
  const [params, providers] = await Promise.all([
    searchParams,
    getSocialProviderAvailability(),
  ]);
  const next = getSafeRedirect(params.next, "/seller/dashboard");
  const notice =
    params.message === "session-expired"
      ? "Your session has expired. Sign in again."
      : undefined;

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-6 sm:grid sm:place-items-center sm:px-6">
      <section className="mx-auto w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <BrandLogo compact priority />
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Supplier portal
        </p>
        <h1 className="mt-2 font-body text-3xl font-bold tracking-tight text-stone-950">
          Sign in to your store
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Manage your products, inventory, requests, and orders.
        </p>
        <AuthForm
          context="vendor"
          next={next}
          notice={notice}
          providers={providers}
          variant="login"
        />
      </section>
    </div>
  );
}
