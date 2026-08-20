import { redirect } from "next/navigation";

import { hasSupabaseEnvironment } from "@/config/env";
import { canAccessRole } from "@/lib/auth/authorization";
import type { Principal } from "@/lib/auth/types";
import type { UserRole } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentPrincipal(): Promise<Principal | null> {
  if (!hasSupabaseEnvironment()) {
    return null;
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || typeof userId !== "string") {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return null;
  }

  return {
    email: profile.email,
    fullName: profile.full_name,
    id: profile.id,
    role: profile.role,
    status: profile.status,
  };
}

export async function requirePrincipal(returnTo: string) {
  const principal = await getCurrentPrincipal();

  if (!principal) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  if (principal.status !== "ACTIVE") {
    redirect("/account-restricted");
  }

  return principal;
}

export async function requireRole(allowedRoles: readonly UserRole[], returnTo: string) {
  const principal = await requirePrincipal(returnTo);

  if (!canAccessRole(principal.role, allowedRoles)) {
    redirect("/forbidden");
  }

  return principal;
}
