import type { UserRole } from "@/lib/supabase/database.types";

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
