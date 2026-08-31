import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getPostAuthDestination } from "@/lib/auth/authorization";
import { getCurrentPrincipal } from "@/lib/auth/principal";
import { getSocialProviderAvailability } from "@/lib/auth/providers";
import { getSafeRedirect } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  description:
    "Sign in securely to your Twenty-Two Parts buyer, supplier, or admin account.",
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
    provider?: string;
  }>;
}) {
  const [params, principal] = await Promise.all([
    searchParams,
    getCurrentPrincipal(),
  ]);
  const next = params.next
    ? getSafeRedirect(params.next, "/marketplace")
    : undefined;

  if (principal) {
    if (principal.status !== "ACTIVE") redirect("/account-restricted");
    redirect(getPostAuthDestination(principal.role, next));
  }

  const providers = await getSocialProviderAvailability();
  const providerLabel =
    params.provider === "apple"
      ? "Apple"
      : params.provider === "google"
        ? "Google"
        : "Social";
  const notice =
    params.message === "password-updated"
      ? "Your password has been updated. Sign in with your new password."
      : params.error === "configuration"
        ? "Authentication is being configured. Please try again shortly."
        : params.error === "oauth"
          ? `${providerLabel} sign-in could not be started. Use email sign-in or try again shortly.`
          : params.error === "callback"
            ? "The sign-in link is invalid or expired. Please try again."
            : params.error === "profile"
              ? "Your account identity was verified, but its marketplace profile could not be resolved safely."
              : params.error === "restricted"
                ? "This account cannot sign in right now. Contact support for assistance."
                : undefined;

  return (
    <AuthShell
      description="Access saved vehicle details, part requests, supplier tools, and account settings from one secure account."
      eyebrow="Account access"
      title="Welcome back to the parts market."
    >
      <h2 className="text-3xl font-semibold text-stone-950">Sign in</h2>
      <p className="mt-2 text-stone-600">
        Use your buyer, supplier, or team account.
      </p>
      <AuthForm
        next={next}
        notice={notice}
        providers={providers}
        variant="login"
      />
    </AuthShell>
  );
}
