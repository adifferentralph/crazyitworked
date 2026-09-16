import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { BrandLogo } from "@/components/brand/brand-logo";
import { getHomeForRole } from "@/lib/auth/authorization";
import { getCurrentPrincipal } from "@/lib/auth/principal";
import { getSocialProviderAvailability } from "@/lib/auth/providers";

export const metadata: Metadata = {
  description: "Create a Twenty-Two Parts seller account.",
  title: "Create seller account",
};

export default async function VendorSignupPage() {
  const principal = await getCurrentPrincipal();

  if (principal) {
    if (principal.status !== "ACTIVE") redirect("/account-restricted");
    redirect(getHomeForRole(principal.role));
  }

  const providers = await getSocialProviderAvailability();

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-6 sm:grid sm:place-items-center sm:px-6">
      <section className="mx-auto w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <BrandLogo compact priority />
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Seller Portal
        </p>
        <h1 className="mt-2 font-body text-3xl font-bold tracking-tight text-stone-950">
          Create a seller account
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Set up your account to manage products, orders, and your store.
        </p>
        <AuthForm context="vendor" providers={providers} variant="seller-signup" />
      </section>
    </div>
  );
}