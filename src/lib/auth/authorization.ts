import type { UserRole } from "@/lib/supabase/database.types";

import { getSafeRedirect } from "@/lib/auth/redirect";

export function canAccessRole(actualRole: UserRole, allowedRoles: readonly UserRole[]) {
  return allowedRoles.includes(actualRole);
}

export function getHomeForRole(role: UserRole) {
  if (role === "SELLER") {
    return "/seller/dashboard";
  }

  if (role === "ADMIN") {
    return "/admin";
  }

  return "/marketplace";
}

function isWithin(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getPostAuthDestination(
  role: UserRole,
  requested: FormDataEntryValue | string | null | undefined,
) {
  const home = getHomeForRole(role);
  const destination = getSafeRedirect(requested, home);
  const pathname = destination.split(/[?#]/, 1)[0] ?? destination;

  // Password recovery requires an authenticated session for every account role.
  if (pathname === "/reset-password") return destination;

  if (role === "BUYER") {
    if (isWithin(pathname, "/admin") || isWithin(pathname, "/seller")) return home;
    if (isWithin(pathname, "/login") || isWithin(pathname, "/signup")) return home;
    return destination;
  }

  if (role === "SELLER" && isWithin(pathname, "/seller")) return destination;
  if (role === "ADMIN" && isWithin(pathname, "/admin")) return destination;

  return home;
}
