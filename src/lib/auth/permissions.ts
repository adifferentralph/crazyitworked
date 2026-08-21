import "server-only";

import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/principal";
import { createClient } from "@/lib/supabase/server";

export type AdminPermission =
  | "admin.manage"
  | "assist_seller_inventory"
  | "demand.read"
  | "fitment.manage"
  | "audit.read"
  | "products.approve"
  | "products.edit"
  | "products.read";

export async function hasAdminPermission(permission: AdminPermission) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_permission" as never, {
    permission_code: permission,
  } as never);

  return !error && data === true;
}

export async function requireAdminPermission(permission: AdminPermission, returnTo: string) {
  const principal = await requireRole(["ADMIN"], returnTo);
  if (!(await hasAdminPermission(permission))) redirect("/forbidden");
  return principal;
}