"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import {
  buyerSignupAction,
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
  sellerSignupAction,
  signInWithGoogleAction,
} from "@/app/(auth)/actions";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthField } from "@/components/auth/auth-field";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Button } from "@/components/ui/button";
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
  "buyer-signup": { idle: "Create buyer account", pending: "Creating account…" },
  forgot: { idle: "Send reset link", pending: "Sending reset link…" },
  login: { idle: "Sign in", pending: "Signing in…" },
  reset: { idle: "Set new password", pending: "Updating password…" },
  "seller-signup": { idle: "Create supplier account", pending: "Creating account…" },
};

export function AuthForm({
  next,
  notice,
  variant,
}: {
  next?: string;
  notice?: string;
  variant: AuthVariant;
}) {
  const [state, formAction] = useActionState(actions[variant], initialAuthActionState);
  const isSignup = variant === "buyer-signup" || variant === "seller-signup";
  const showGoogle = variant === "login" || variant === "buyer-signup";
  const submitLabel = submitLabels[variant];
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "error") return;

    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  return (
    <div className="mt-7 max-w-lg">
      {notice ? (
        <div
          className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {showGoogle ? (
        <>
          <form action={signInWithGoogleAction}>
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <Button className="h-12 w-full" type="submit" variant="outline">
              Continue with Google
            </Button>
          </form>
          <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            <span className="h-px flex-1 bg-stone-200" />
            or continue with email
            <span className="h-px flex-1 bg-stone-200" />
          </div>
        </>
      ) : null}

      <form action={formAction} className="grid gap-5" noValidate ref={formRef}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div
          className="absolute -left-[10000px] top-auto size-px overflow-hidden"
          aria-hidden="true"
        >
          <label htmlFor={`${variant}-gotcha`}>Leave this field blank</label>
          <input
            id={`${variant}-gotcha`}
            name="_gotcha"
            type="text"
            tabIndex={-1}
            autoComplete="off"
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
                aria-describedby={state.fieldErrors?.terms?.[0] ? "terms-error" : undefined}
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
              <p id="terms-error" className="mt-2 text-sm font-medium text-primary">
                {state.fieldErrors.terms[0]}
              </p>
            ) : null}
          </div>
        ) : null}

        {variant === "login" ? (
          <div className="-mt-2 text-right">
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
      <p className="mt-6 text-sm text-stone-600">
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
      <p className="mt-6 text-sm text-stone-600">
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
      <p className="mt-6 text-sm text-stone-600">
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
    <p className="mt-6 text-sm text-stone-600">
      <Link
        className="font-semibold text-primary underline-offset-4 focus-visible:underline"
        href="/login"
      >
        Return to sign in
      </Link>
    </p>
  );
}
