import type { MarketplaceRole } from "@/lib/marketplace/types";

export type Permission =
  | "admin:read"
  | "admin:write"
  | "ads:manage"
  | "catalog:moderate"
  | "messages:read"
  | "orders:manage"
  | "products:manage"
  | "rfqs:quote"
  | "users:manage"
  | "vendors:approve";

const permissionsByRole: Record<MarketplaceRole, Permission[]> = {
  buyer: ["messages:read"],
  vendor: ["products:manage", "orders:manage", "messages:read", "rfqs:quote", "ads:manage"],
  support_agent: ["admin:read", "messages:read", "orders:manage"],
  moderator: ["admin:read", "catalog:moderate", "vendors:approve"],
  admin: [
    "admin:read",
    "admin:write",
    "ads:manage",
    "catalog:moderate",
    "orders:manage",
    "users:manage",
    "vendors:approve",
  ],
  super_admin: [
    "admin:read",
    "admin:write",
    "ads:manage",
    "catalog:moderate",
    "messages:read",
    "orders:manage",
    "products:manage",
    "rfqs:quote",
    "users:manage",
    "vendors:approve",
  ],
};

export function hasPermission(roles: MarketplaceRole[], permission: Permission) {
  return roles.some((role) => permissionsByRole[role].includes(permission));
}

export function requirePermission(roles: MarketplaceRole[], permission: Permission) {
  if (!hasPermission(roles, permission)) {
    throw new Error(`Missing required permission: ${permission}`);
  }
}
