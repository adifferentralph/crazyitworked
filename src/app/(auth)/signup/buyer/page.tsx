import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  description: "Create a Twenty-Two Parts buyer account to find compatible automotive parts.",
  title: "Create buyer account",
};

export default function BuyerSignupPage() {
  return (
    <AuthShell
      description="Save your vehicle details and make clearer part requests without repeating the same information each time."
      eyebrow="Buyer registration"
      title="Start with the vehicle. Find the right part."
    >
      <h2 className="text-3xl font-semibold text-stone-950">Create a buyer account</h2>
      <p className="mt-3 text-stone-600">For drivers, workshops, and fleet teams sourcing parts.</p>
      <AuthForm variant="buyer-signup" />
    </AuthShell>
  );
}
