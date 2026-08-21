"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdminPermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

type FitmentCorrectionState = { message?: string; status: "idle" | "error" | "success" };

const correctionSchema = z.object({
  evidence: z.enum(["SELLER_CLAIMED", "OEM_MATCHED", "PLATFORM_VERIFIED", "DISPUTED", "KNOWN_INCORRECT"]),
  fitmentId: z.string().uuid(),
  isActive: z.preprocess((value) => value === "true", z.boolean()),
  productId: z.string().uuid(),
  reason: z.string().trim().min(10, "Explain the evidence or correction in at least 10 characters.").max(1000),
});

export async function correctProductFitmentAction(
  _previousState: FitmentCorrectionState,
  formData: FormData,
): Promise<FitmentCorrectionState> {
  await requireAdminPermission("fitment.manage", "/admin/fitment-intelligence");
  const parsed = correctionSchema.safeParse({
    evidence: formData.get("evidence"),
    fitmentId: formData.get("fitmentId"),
    isActive: formData.get("isActive"),
    productId: formData.get("productId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Check the correction fields.", status: "error" };
  if (["DISPUTED", "KNOWN_INCORRECT"].includes(parsed.data.evidence) && parsed.data.isActive) {
    return { message: "Disputed or known-incorrect compatibility must be removed from marketplace matching.", status: "error" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("correct_product_fitment", {
    p_evidence: parsed.data.evidence,
    p_fitment_id: parsed.data.fitmentId,
    p_is_active: parsed.data.isActive,
    p_product_id: parsed.data.productId,
    p_reason: parsed.data.reason,
  });
  if (error) return { message: "The fitment correction was not saved.", status: "error" };
  revalidatePath("/admin/fitment-intelligence");
  return { message: "Fitment evidence updated and recorded in immutable history.", status: "success" };
}