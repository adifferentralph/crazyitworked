"use client";

import { Apple, Chrome } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import {
  buyerSignupAction,
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
  sellerSignupAction,
  signInWithAppleAction,
  signInWithGoogleAction,
} from "@/app/(auth)/actions";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { BuyerSignupWizardFields } from "@/components/auth/buyer-signup-wizard-fields";
import { SellerSignupWizardFields } from "@/components/auth/seller-signup-wizard-fields";
import { Button } from "@/components/ui/button";
import type { SocialProviderAvailability } from "@/lib/auth/providers";
import { initialAuthActionState } from "@/lib/auth/types";

type AuthVariant = "login" | "buyer-signup" | "seller-signup" | "forgot" | "reset";

const actions = {
  "buyer-signup": buyerSignupAction,
  forgot: forgotPasswordAction,
  login: loginAction,
  reset: resetPasswordAction,
  "seller-signup": sellerSignupAction,
} as const;

const submitLabels: Record<AuthVariant, { idle: string; pending: string }> = {
  "buyer-signup": {
    idle: "Create buyer account",
    pending: "Creating account…",
  },
  forgot: { idle: "Send reset link", pending: "Sending reset link…" },
  login: { idle: "Sign in", pending: "Signing in…" },
  reset: { idle: "Set new password", pending: "Updating password…" },
  "seller-signup": {
    idle: "Create supplier account",
    pending: "Creating account…",
  },
};

const noSocialProviders: SocialProviderAvailability = {
  apple: false,
  google: false,
};

export function AuthForm({
  context = "universal",
  next,
  notice,
  providers = noSocialProviders,
  variant,
}: {
  context?: "universal" | "vendor";
  next?: string;
  notice?: string;
  providers?: SocialProviderAvailability;
  variant: AuthVariant;
}) {
  const [state, formAction] = useActionState(actions[variant], initialAuthActionState);
  const isSignup = variant === "buyer-signup" || variant === "seller-signup";
  const showSocial = variant === "login" || isSignup;
  const submitLabel = submitLabels[variant];
  const formRef = useRef<HTMLFormElement>(null);
  const oauthIntent = variant === "seller-signup" ? "SELLER" : "BUYER";
  const socialOptions = [
    {
      action: signInWithGoogleAction,
      enabled: providers.google,
      icon: Chrome,
      label: "Continue with Google",
      provider: "google",
    },
    {
      action: signInWithAppleAction,
      enabled: providers.apple,
      icon: Apple,
      label: "Continue with Apple",
      provider: "apple",
    },
  ] as const;
  const enabledSocialOptions = socialOptions.filter((option) => option.enabled);

  useEffect(() => {
    if (variant === "buyer-signup" || state.status !== "error") return;

    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state, variant]);

  return (
    <div className="mt-5 max-w-lg sm:mt-6">
      {notice ? (
        <div
          className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {showSocial && enabledSocialOptions.length > 0 ? (
        <>
          <div
            className={
              enabledSocialOptions.length > 1 ? "grid gap-2 min-[390px]:grid-cols-2" : "grid gap-2"
            }
          >
            {enabledSocialOptions.map(({ action, icon: Icon, label, provider }) => (
              <form action={action} key={provider}>
                {next ? <input type="hidden" name="next" value={next} /> : null}
                <input type="hidden" name="intent" value={oauthIntent} />
                <Button className="h-11 w-full px-3" type="submit" variant="outline">
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </Button>
              </form>
            ))}
          </div>
          <div className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500 sm:my-5">
            <span className="h-px flex-1 bg-stone-200" />
            or use email
            <span className="h-px flex-1 bg-stone-200" />
          </div>
        </>
      ) : null}

      <form action={formAction} className="grid gap-4 sm:gap-5" noValidate ref={formRef}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div
          className="absolute -left-[10000px] top-auto size-px overflow-hidden"
          aria-hidden="true"
        >
          <label htmlFor={`${variant}-gotcha`}>Leave this field blank</label>
          <input
            autoComplete="off"
            id={`${variant}-gotcha`}
            name="_gotcha"
            tabIndex={-1}
            type="text"
          />
        </div>

        {variant === "seller-signup" ? <SellerSignupWizardFields state={state} /> : null}

        {variant === "buyer-signup" ? <BuyerSignupWizardFields state={state} /> : null}

        {variant !== "reset" && variant !== "buyer-signup" && variant !== "seller-signup" ? (
          <AuthField
            autoComplete="email"
            defaultValue={state.values?.email}
            errors={state.fieldErrors?.email}
            inputMode="email"
            label="Email address"
            name="email"
            placeholder="you@example.com"
            type="email"
          />
        ) : null}

        {variant === "login" || variant === "reset" ? (
          <AuthField
            autoComplete={variant === "login" ? "current-password" : "new-password"}
            errors={state.fieldErrors?.password}
            label={variant === "reset" ? "New password" : "Password"}
            minLength={variant === "login" ? undefined : 8}
            name="password"
            type="password"
          />
        ) : null}

        {variant === "reset" ? (
          <AuthField
            autoComplete="new-password"
            errors={state.fieldErrors?.confirmPassword}
            label={variant === "reset" ? "Confirm new password" : "Confirm password"}
            minLength={8}
            name="confirmPassword"
            type="password"
          />
        ) : null}

        {variant === "login" ? (
          <div className="-mt-1 text-right">
            <Link
              className="text-sm font-semibold text-primary underline-offset-4 focus-visible:underline"
              href="/forgot-password"
            >
              Forgot password?
            </Link>
          </div>
        ) : null}

        {variant !== "buyer-signup" && variant !== "seller-signup" ? (
          <>
            <AuthAlert state={state} />
            <AuthSubmitButton label={submitLabel.idle} pendingLabel={submitLabel.pending} />
          </>
        ) : null}
      </form>

      <AuthFooter context={context} variant={variant} />
    </div>
  );
}

function AuthFooter({
  context,
  variant,
}: {
  context: "universal" | "vendor";
  variant: AuthVariant;
}) {
  if (variant === "login") {
    if (context === "vendor") {
      return (
        <p className="mt-5 text-sm text-stone-600">
          New supplier?{" "}
          <Link
            className="font-semibold text-primary underline-offset-4 focus-visible:underline"
            href="/signup"
          >
            Create supplier account
          </Link>
        </p>
      );
    }

    return (
      <p className="mt-5 text-sm text-stone-600">
        New to Twenty-Two Parts?{" "}
        <Link
          className="font-semibold text-primary underline-offset-4 focus-visible:underline"
          href="/signup/buyer"
        >
          Create account
        </Link>
      </p>
    );
  }

  if (variant === "buyer-signup") {
    return (
      <p className="mt-5 text-sm text-stone-600">
        Already registered?{" "}
        <Link
          className="font-semibold text-primary underline-offset-4 focus-visible:underline"
          href="/login"
        >
          Sign in
        </Link>
      </p>
    );
  }

  if (variant === "seller-signup") {
    return (
      <p className="mt-5 text-sm text-stone-600">
        Already have a supplier account?{" "}
        <Link
          className="font-semibold text-primary underline-offset-4 focus-visible:underline"
          href="/login?next=/seller/dashboard"
        >
          Supplier sign in
        </Link>
      </p>
    );
  }

  return (
    <p className="mt-5 text-sm text-stone-600">
      <Link
        className="font-semibold text-primary underline-offset-4 focus-visible:underline"
        href="/login"
      >
        Return to sign in
      </Link>
    </p>
  );
}
