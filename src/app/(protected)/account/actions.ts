"use server";

import { revalidatePath } from "next/cache";

import type { BuyerActionState } from "@/lib/account/buyer-action-state";
import { requireRole } from "@/lib/auth/principal";
import { createClient } from "@/lib/supabase/server";
import {
  buyerProfileSchema,
  savedVehicleIdSchema,
  savedVehicleSchema,
} from "@/lib/validation/buyer";


function invalid(fieldErrors: Record<string, string[] | undefined>): BuyerActionState {
  return { fieldErrors, message: "Check the highlighted fields and try again.", status: "error" };
}

export async function updateBuyerProfileAction(
  _previousState: BuyerActionState,
  formData: FormData,
): Promise<BuyerActionState> {
  const principal = await requireRole(["BUYER"], "/account/security");
  const parsed = buyerProfileSchema.safeParse({
    accountType: formData.get("accountType"),
    businessRegistrationNumber: formData.get("businessRegistrationNumber"),
    organizationName: formData.get("organizationName"),
  });
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { error } = await supabase
    .from("buyer_profiles")
    .update({
      account_type: parsed.data.accountType,
      business_registration_number: parsed.data.businessRegistrationNumber,
      organization_name: parsed.data.organizationName,
    })
    .eq("user_id", principal.id);

  if (error) return { message: "We could not update your profile. Try again.", status: "error" };
  revalidatePath("/account");
  revalidatePath("/account/security");
  return { message: "Buyer profile updated.", status: "success" };
}

export async function saveVehicleAction(
  _previousState: BuyerActionState,
  formData: FormData,
): Promise<BuyerActionState> {
  const principal = await requireRole(["BUYER"], "/account/vehicles");
  const parsed = savedVehicleSchema.safeParse({
    fitmentId: formData.get("fitmentId"),
    isDefault: formData.get("isDefault"),
    label: formData.get("label"),
    registrationNumber: formData.get("registrationNumber"),
  });
  if (!parsed.success) return invalid(parsed.error.flatten().fieldErrors);

  const supabase = await createClient();
  const { count } = await supabase
    .from("saved_vehicles")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", principal.id);
  const isDefault = parsed.data.isDefault || count === 0;

  if (isDefault) {
    const { error: resetError } = await supabase
      .from("saved_vehicles")
      .update({ is_default: false })
      .eq("buyer_id", principal.id)
      .eq("is_default", true);
    if (resetError) return { message: "We could not update your default vehicle.", status: "error" };
  }

  const { error } = await supabase.from("saved_vehicles").upsert(
    {
      buyer_id: principal.id,
      fitment_id: parsed.data.fitmentId,
      is_default: isDefault,
      label: parsed.data.label,
      registration_number: parsed.data.registrationNumber,
    },
    { onConflict: "buyer_id,fitment_id" },
  );

  if (error) return { message: "We could not save that vehicle. Try again.", status: "error" };
  revalidatePath("/account/vehicles");
  revalidatePath("/marketplace");
  return { message: "Vehicle saved.", status: "success" };
}

export async function setDefaultVehicleAction(formData: FormData) {
  const principal = await requireRole(["BUYER"], "/account/vehicles");
  const parsed = savedVehicleIdSchema.safeParse({ vehicleId: formData.get("vehicleId") });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("saved_vehicles").update({ is_default: false }).eq("buyer_id", principal.id);
  await supabase
    .from("saved_vehicles")
    .update({ is_default: true })
    .eq("id", parsed.data.vehicleId)
    .eq("buyer_id", principal.id);
  revalidatePath("/account/vehicles");
  revalidatePath("/marketplace");
}

export async function deleteSavedVehicleAction(formData: FormData) {
  const principal = await requireRole(["BUYER"], "/account/vehicles");
  const parsed = savedVehicleIdSchema.safeParse({ vehicleId: formData.get("vehicleId") });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: deleting } = await supabase
    .from("saved_vehicles")
    .select("is_default")
    .eq("id", parsed.data.vehicleId)
    .eq("buyer_id", principal.id)
    .maybeSingle();
  await supabase
    .from("saved_vehicles")
    .delete()
    .eq("id", parsed.data.vehicleId)
    .eq("buyer_id", principal.id);
  if (deleting?.is_default) {
    const { data: replacement } = await supabase
      .from("saved_vehicles")
      .select("id")
      .eq("buyer_id", principal.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (replacement) {
      await supabase.from("saved_vehicles").update({ is_default: true }).eq("id", replacement.id);
    }
  }
  revalidatePath("/account/vehicles");
  revalidatePath("/marketplace");
}