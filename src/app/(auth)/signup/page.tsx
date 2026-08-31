import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Store, Wrench } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { getHomeForRole } from "@/lib/auth/authorization";
import { getCurrentPrincipal } from "@/lib/auth/principal";

export const metadata: Metadata = {
  description: "Choose a buyer or supplier account for Twenty-Two Parts.",
  title: "Create an account",
};

const accountTypes = [
  {
    description:
      "Find compatible parts, save vehicles, and manage part requests.",
    href: "/signup/buyer",
    icon: Wrench,
    label: "I need automotive parts",
  },
  {
    description:
      "Create a store account and prepare to list and manage inventory.",
    href: "/signup/seller",
    icon: Store,
    label: "I sell automotive parts",
  },
] as const;

export default async function SignupPage() {
  const principal = await getCurrentPrincipal();

  if (principal) {
    if (principal.status !== "ACTIVE") redirect("/account-restricted");
    redirect(getHomeForRole(principal.role));
  }

  return (
    <AuthShell
      description="Start with the account that matches how you use the marketplace. Each role has separate, protected tools."
      eyebrow="Create account"
      title="The right access from day one."
    >
      <h2 className="text-3xl font-semibold text-stone-950">
        How will you use Twenty-Two Parts?
      </h2>
      <p className="mt-2 text-stone-600">
        Choose one account type to continue.
      </p>

      <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4">
        {accountTypes.map(({ description, href, icon: Icon, label }) => (
          <Link
            className="flex items-start gap-4 rounded-lg border border-stone-300 bg-white p-4 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 sm:p-5"
            href={href}
            key={href}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-black text-white">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-stone-950">
                {label}
              </span>
              <span className="mt-1 block text-sm leading-6 text-stone-600">
                {description}
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="mt-1 size-5 shrink-0 text-primary"
            />
          </Link>
        ))}
      </div>

      <p className="mt-5 text-sm text-stone-600">
        Already registered?{" "}
        <Link
          className="font-semibold text-primary underline-offset-4 focus-visible:underline"
          href="/login"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
