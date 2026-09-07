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
  next,
  notice,
  providers = noSocialProviders,
  variant,
}: {
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
    if (state.status !== "error") return;

    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

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

        {isSignup ? (
          <AuthField
            autoComplete="name"
            defaultValue={state.values?.fullName}
            errors={state.fieldErrors?.fullName}
            label="Full name"
            name="fullName"
            placeholder="Your full name"
            type="text"
          />
        ) : null}

        {variant === "buyer-signup" ? (
          <>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-stone-800" htmlFor="buyer-account-type">
                How will you use Twenty-Two Parts?
              </label>
              <select
                aria-describedby={
                  state.fieldErrors?.accountType?.[0] ? "buyer-account-type-error" : undefined
                }
                aria-invalid={Boolean(state.fieldErrors?.accountType?.[0])}
                className={`h-12 w-full rounded-md border bg-white px-3.5 text-base text-stone-950 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                  state.fieldErrors?.accountType?.[0]
                    ? "border-primary bg-red-50 ring-2 ring-primary/20"
                    : "border-stone-300"
                }`}
                defaultValue={state.values?.accountType ?? "INDIVIDUAL"}
                id="buyer-account-type"
                name="accountType"
              >
                <option value="INDIVIDUAL">Individual vehicle owner</option>
                <option value="MECHANIC_TECHNICIAN">Mechanic or technician</option>
                <option value="GARAGE_WORKSHOP">Garage or workshop</option>
                <option value="FLEET_OPERATOR">Fleet operator</option>
                <option value="CORPORATE_BUYER">Corporate buyer</option>
              </select>
              {state.fieldErrors?.accountType?.[0] ? (
                <p className="text-sm font-medium text-primary" id="buyer-account-type-error">
                  {state.fieldErrors.accountType[0]}
                </p>
              ) : null}
            </div>
            <AuthField
              autoComplete="organization"
              defaultValue={state.values?.organizationName}
              errors={state.fieldErrors?.organizationName}
              label="Business or organisation name (optional for individuals)"
              name="organizationName"
              placeholder="Your workshop, fleet, or company"
              type="text"
            />
          </>
        ) : null}

        {variant === "seller-signup" ? (
          <AuthField
            autoComplete="organization"
            defaultValue={state.values?.storeName}
            errors={state.fieldErrors?.storeName}
            label="Store or business name"
            name="storeName"
            placeholder="Your parts business"
            type="text"
          />
        ) : null}

        {variant !== "reset" ? (
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

        {variant === "login" || isSignup || variant === "reset" ? (
          <AuthField
            autoComplete={variant === "login" ? "current-password" : "new-password"}
            errors={state.fieldErrors?.password}
            label={variant === "reset" ? "New password" : "Password"}
            minLength={variant === "login" ? undefined : 8}
            name="password"
            type="password"
          />
        ) : null}

        {isSignup || variant === "reset" ? (
          <AuthField
            autoComplete="new-password"
            errors={state.fieldErrors?.confirmPassword}
            label={variant === "reset" ? "Confirm new password" : "Confirm password"}
            minLength={8}
            name="confirmPassword"
            type="password"
          />
        ) : null}

        {isSignup ? (
          <div>
            <div className="flex items-start gap-3 text-sm leading-6 text-stone-700">
              <input
                aria-describedby={
                  state.fieldErrors?.terms?.[0] ? `${variant}-terms-error` : undefined
                }
                aria-invalid={Boolean(state.fieldErrors?.terms?.[0])}
                className={`mt-1 size-4 rounded border-stone-300 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  state.fieldErrors?.terms?.[0] ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
                defaultChecked={state.values?.terms === "on"}
                id={`${variant}-terms`}
                name="terms"
                type="checkbox"
              />
              <span>
                <label htmlFor={`${variant}-terms`}>
                  I agree to the Terms of Use and acknowledge the{" "}
                </label>
                <Link
                  className="font-semibold text-primary underline underline-offset-4"
                  href="/privacy-policy"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </div>
            {state.fieldErrors?.terms?.[0] ? (
              <p className="mt-2 text-sm font-medium text-primary" id={`${variant}-terms-error`}>
                {state.fieldErrors.terms[0]}
              </p>
            ) : null}
          </div>
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

        <AuthAlert state={state} />
        <AuthSubmitButton label={submitLabel.idle} pendingLabel={submitLabel.pending} />
      </form>

      <AuthFooter variant={variant} />
    </div>
  );
}

function AuthFooter({ variant }: { variant: AuthVariant }) {
  if (variant === "login") {
    return (
      <p className="mt-5 text-sm text-stone-600">
        New to Twenty-Two Parts?{" "}
        <Link
          className="font-semibold text-primary underline-offset-4 focus-visible:underline"
          href="/signup"
        >
          Choose an account type
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
