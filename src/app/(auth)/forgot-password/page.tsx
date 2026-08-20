import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  description: "Request a secure password reset link for your Twenty-Two Parts account.",
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      description="We will send a time-limited recovery link to the email address connected to your account."
      eyebrow="Account recovery"
      title="A secure way back into your account."
    >
      <h2 className="text-3xl font-semibold text-stone-950">Reset your password</h2>
      <p className="mt-3 text-stone-600">Enter your account email to request a reset link.</p>
      <AuthForm variant="forgot" />
    </AuthShell>
  );
}
