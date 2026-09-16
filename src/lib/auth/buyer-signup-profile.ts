import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";

const buyerSignupMetadataSchema = z.object({
  marketing_opt_in: z.boolean().optional().default(false),
  phone: z.string().trim().max(30).optional(),
  requested_role: z.literal("BUYER"),
});

export async function syncBuyerSignupProfile(
  supabase: SupabaseClient<Database>,
  user: User,
) {
  const metadata = buyerSignupMetadataSchema.safeParse(user.user_metadata);
  if (!metadata.success) return;

  const phone = metadata.data.phone || null;
  const changedAt = new Date().toISOString();
  const [profileResult, preferencesResult] = await Promise.all([
    supabase.from("profiles").update({ phone }).eq("id", user.id),
    supabase
      .from("buyer_profiles")
      .update({
        marketing_opt_in: metadata.data.marketing_opt_in,
        marketing_opted_in_at: metadata.data.marketing_opt_in ? changedAt : null,
        marketing_unsubscribed_at: null,
      })
      .eq("user_id", user.id),
  ]);

  if (profileResult.error || preferencesResult.error) {
    throw new Error("Buyer signup profile metadata could not be synchronized.");
  }
}