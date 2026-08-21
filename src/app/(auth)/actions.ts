"use server";

import { redirect } from "next/navigation";
import type { z } from "zod";

import { getAppUrl, hasSupabaseEnvironment } from "@/config/env";
import { getHomeForRole } from "@/lib/auth/authorization";
import { getSafeRedirect } from "@/lib/auth/redirect";
import type { AuthActionState } from "@/lib/auth/types";
import type { UserRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  authBotTrapField,
  buyerSignupSchema,
  forgotPasswordSchema,
  getFormValues,
  loginSchema,
  resetPasswordSchema,
  sellerSignupSchema,
} from "@/lib/validation/auth";

const configurationError: AuthActionState = {
  message: "Authentication is being configured. Please try again shortly.",
  status: "error",
};

function getSafeSubmittedValues(formData: FormData): AuthActionState["values"] {
  const getText = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : undefined;
  };

  return {
    email: getText("email"),
    fullName: getText("fullName"),
    storeName: getText("storeName"),
    terms: formData.get("terms") === "on" ? "on" : undefined,
  };
}

function validationError(error: z.ZodError, formData: FormData): AuthActionState {
  const fieldErrors = error.flatten().fieldErrors;
  const botTrapFailed = Boolean(fieldErrors[authBotTrapField]?.length);
  delete fieldErrors[authBotTrapField];

  return {
    fieldErrors,
    message: botTrapFailed
      ? "We could not submit this form safely. Refresh the page and try again."
      : "Check the highlighted fields and try again.",
    status: "error",
    values: getSafeSubmittedValues(formData),
  };
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(getFormValues(formData));

  if (!parsed.success) {
    return validationError(parsed.error, formData);
  }

  if (!hasSupabaseEnvironment()) {
    return configurationError;
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    return {
      message: "The email or password is incorrect.",
      status: "error",
      values: getSafeSubmittedValues(formData),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status")
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      message: "Your account profile could not be loaded. Contact support if this continues.",
      status: "error",
    };
  }

  if (profile.status !== "ACTIVE") {
    await supabase.auth.signOut();
    return {
      message: "This account cannot sign in right now. Contact support for assistance.",
      status: "error",
    };
  }

  redirect(getSafeRedirect(formData.get("next"), getHomeForRole(profile.role)));
}

async function signup(
  formData: FormData,
  role: Extract<UserRole, "BUYER" | "SELLER">,
): Promise<AuthActionState> {
  const schema = role === "SELLER" ? sellerSignupSchema : buyerSignupSchema;
  const parsed = schema.safeParse(getFormValues(formData));

  if (!parsed.success) {
    return validationError(parsed.error, formData);
  }

  if (!hasSupabaseEnvironment()) {
    return configurationError;
  }

  const supabase = await createClient();
  const storeName = "storeName" in parsed.data ? parsed.data.storeName : undefined;
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        requested_role: role,
        ...(storeName ? { store_name: storeName } : {}),
      },
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(getHomeForRole(role))}`,
    },
  });

  if (error) {
    return {
      message: "We could not create the account. Check your details or try again shortly.",
      status: "error",
      values: getSafeSubmittedValues(formData),
    };
  }

  if (data.session) {
    redirect(getHomeForRole(role));
  }

  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function buyerSignupAction(_previousState: AuthActionState, formData: FormData) {
  return signup(formData, "BUYER");
}

export async function sellerSignupAction(_previousState: AuthActionState, formData: FormData) {
  return signup(formData, "SELLER");
}

export async function forgotPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse(getFormValues(formData));

  if (!parsed.success) {
    return validationError(parsed.error, formData);
  }

  if (!hasSupabaseEnvironment()) {
    return configurationError;
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getAppUrl()}/auth/callback?next=/reset-password`,
  });

  return {
    message: "If an account exists for that email, a secure password reset link is on its way.",
    status: "success",
  };
}

export async function resetPasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse(getFormValues(formData));

  if (!parsed.success) {
    return validationError(parsed.error, formData);
  }

  if (!hasSupabaseEnvironment()) {
    return configurationError;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return {
      message: "This reset link is invalid or expired. Request a new password reset email.",
      status: "error",
    };
  }

  await supabase.auth.signOut();
  redirect("/login?message=password-updated");
}

export async function signInWithGoogleAction(formData: FormData) {
  if (!hasSupabaseEnvironment()) {
    redirect("/login?error=configuration");
  }

  const supabase = await createClient();
  const next = getSafeRedirect(formData.get("next"), "/account");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth");
  }

  redirect(data.url);
}

export async function signOutAction() {
  if (hasSupabaseEnvironment()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
