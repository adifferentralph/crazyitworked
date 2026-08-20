import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  description: "Choose a new password for your Twenty-Two Parts account.",
  title: "Set new password",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      description="Use a strong password that you do not use for another service. Your recovery link must still be valid."
      eyebrow="Password reset"
      title="Choose a new account password."
    >
      <h2 className="text-3xl font-semibold text-stone-950">Set a new password</h2>
      <p className="mt-3 text-stone-600">Use at least 8 characters.</p>
      <AuthForm variant="reset" />
    </AuthShell>
  );
}
