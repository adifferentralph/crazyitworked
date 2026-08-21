import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getInventoryOnboardingSellers() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("inventory_onboarding_sellers");
  if (error) throw new Error("Eligible sellers could not be loaded.");
  return data ?? [];
}

export async function getInventoryOnboardingProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("inventory_onboarding_products");
  if (error) throw new Error("Assisted product drafts could not be loaded.");
  return data ?? [];
}

export async function getInventoryImports() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_imports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("Inventory import history could not be loaded.");
  return data ?? [];
}

export async function getInventoryImport(importId: string) {
  const supabase = await createClient();
  const [importResult, rowsResult] = await Promise.all([
    supabase.from("inventory_imports").select("*").eq("id", importId).single(),
    supabase
      .from("inventory_import_rows")
      .select("*")
      .eq("import_id", importId)
      .order("row_number"),
  ]);
  if (importResult.error || !importResult.data || rowsResult.error) return null;
  return { importRecord: importResult.data, rows: rowsResult.data ?? [] };
}