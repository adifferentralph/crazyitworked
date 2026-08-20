import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  description: "Verify the email address for your Twenty-Two Parts account.",
  title: "Verify your email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthShell
      description="Email verification protects your account and confirms where important order and security updates should be sent."
      eyebrow="Email verification"
      title="One final account check."
    >
      <div className="grid size-14 place-items-center rounded-full bg-red-50 text-primary">
        <MailCheck className="size-7" aria-hidden="true" />
      </div>
      <h2 className="mt-6 text-3xl font-semibold text-stone-950">Check your email</h2>
      <p className="mt-3 max-w-lg leading-7 text-stone-600">
        We sent a verification link{email ? ` to ${email}` : " to your email address"}. Open it in
        the same browser to activate your account securely.
      </p>
      <p className="mt-4 text-sm leading-6 text-stone-500">
        If it is not in your inbox, check spam or wait a few minutes before trying again.
      </p>
      <Button asChild className="mt-7">
        <Link href="/login">Continue to sign in</Link>
      </Button>
    </AuthShell>
  );
}
