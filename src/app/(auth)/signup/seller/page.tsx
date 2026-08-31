import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getHomeForRole } from "@/lib/auth/authorization";
import { getCurrentPrincipal } from "@/lib/auth/principal";
import { getSocialProviderAvailability } from "@/lib/auth/providers";

export const metadata: Metadata = {
  description:
    "Create a supplier account for the Twenty-Two Parts automotive marketplace.",
  title: "Create supplier account",
};

export default async function SellerSignupPage() {
  const principal = await getCurrentPrincipal();

  if (principal) {
    if (principal.status !== "ACTIVE") redirect("/account-restricted");
    redirect(getHomeForRole(principal.role));
  }

  const providers = await getSocialProviderAvailability();

  return (
    <AuthShell
      description="Register the business responsible for listings, inventory, fulfilment, and customer orders."
      eyebrow="Supplier registration"
      title="Give serious buyers a clearer way to buy."
    >
      <h2 className="text-3xl font-semibold text-stone-950">
        Create a supplier account
      </h2>
      <p className="mt-2 text-stone-600">
        Supplier accounts are reviewed before public selling access.
      </p>
      <AuthForm providers={providers} variant="seller-signup" />
    </AuthShell>
  );
}
