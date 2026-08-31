import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  getHomeForRole,
} from "@/lib/auth/authorization";
import { getCurrentPrincipal } from "@/lib/auth/principal";
import { getSocialProviderAvailability } from "@/lib/auth/providers";

export const metadata: Metadata = {
  description:
    "Create a Twenty-Two Parts buyer account to find compatible automotive parts.",
  title: "Create buyer account",
};

export default async function BuyerSignupPage() {
  const principal = await getCurrentPrincipal();

  if (principal) {
    if (principal.status !== "ACTIVE") redirect("/account-restricted");
    redirect(getHomeForRole(principal.role));
  }

  const providers = await getSocialProviderAvailability();

  return (
    <AuthShell
      description="Save your vehicle details and make clearer part requests without repeating the same information each time."
      eyebrow="Buyer registration"
      title="Start with the vehicle. Find the right part."
    >
      <h2 className="text-3xl font-semibold text-stone-950">
        Create a buyer account
      </h2>
      <p className="mt-2 text-stone-600">
        For drivers, workshops, and fleet teams sourcing parts.
      </p>
      <AuthForm providers={providers} variant="buyer-signup" />
    </AuthShell>
  );
}
