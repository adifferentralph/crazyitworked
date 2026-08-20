import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  description: "Create a supplier account for the Twenty-Two Parts automotive marketplace.",
  title: "Create supplier account",
};

export default function SellerSignupPage() {
  return (
    <AuthShell
      description="Register the business responsible for listings, inventory, fulfilment, and customer orders."
      eyebrow="Supplier registration"
      title="Give serious buyers a clearer way to buy."
    >
      <h2 className="text-3xl font-semibold text-stone-950">Create a supplier account</h2>
      <p className="mt-3 text-stone-600">
        Supplier accounts are reviewed before public selling access.
      </p>
      <AuthForm variant="seller-signup" />
    </AuthShell>
  );
}
