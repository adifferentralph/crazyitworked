import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getSafeRedirect } from "@/lib/auth/redirect";

export const metadata: Metadata = {
  description: "Sign in securely to your Twenty-Two Parts buyer, supplier, or admin account.",
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ? getSafeRedirect(params.next, "/account") : undefined;
  const notice =
    params.message === "password-updated"
      ? "Your password has been updated. Sign in with your new password."
      : params.error === "configuration"
        ? "Authentication is being configured. Please try again shortly."
        : params.error === "oauth"
          ? "Google sign-in could not be started. Try email sign-in or try again shortly."
          : params.error === "callback"
            ? "The sign-in link is invalid or expired. Please try again."
            : undefined;

  return (
    <AuthShell
      description="Access saved vehicle details, part requests, supplier tools, and account settings from one secure account."
      eyebrow="Account access"
      title="Welcome back to the parts market."
    >
      <h2 className="text-3xl font-semibold text-stone-950">Sign in</h2>
      <p className="mt-3 text-stone-600">Use your buyer, supplier, or team account.</p>
      <AuthForm next={next} notice={notice} variant="login" />
    </AuthShell>
  );
}
