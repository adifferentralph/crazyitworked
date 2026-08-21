import { BadgeCheck } from "lucide-react";

import { OnboardingForm } from "@/components/seller/onboarding-form";
import { SellerShell } from "@/components/seller/seller-shell";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/principal";
import { createClient } from "@/lib/supabase/server";

export default async function SellerOnboardingPage() {
  const principal = await requireRole(["SELLER"], "/seller/onboarding");
  const supabase = await createClient();
  const [{ data: seller }, { data: verification }] = await Promise.all([
    supabase.from("seller_profiles").select("*").eq("user_id", principal.id).single(),
    supabase.from("seller_verifications").select("status, submitted_at, rejection_reason").eq("seller_id", principal.id).maybeSingle(),
  ]);

  if (!seller) return null;

  return (
    <SellerShell description="Complete your supplier identity once, then keep the profile current for marketplace trust and fulfilment." title="Store profile">
      <div className="mb-7 flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-[#fffdf9] p-4">
        <BadgeCheck className="size-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold text-stone-800">Verification status</span>
        <Badge variant={verification?.status === "APPROVED" ? "default" : "outline"}>{(verification?.status ?? "DRAFT").replaceAll("_", " ").toLowerCase()}</Badge>
        {verification?.rejection_reason ? <p className="w-full text-sm text-stone-600">Review note: {verification.rejection_reason}</p> : null}
      </div>
      <OnboardingForm defaults={{
        businessRegistrationNumber: seller.business_registration_number,
        city: seller.city,
        contactPhone: seller.contact_phone,
        description: seller.description,
        state: seller.state,
        storeName: seller.store_name,
        websiteUrl: seller.website_url,
      }} />
    </SellerShell>
  );
}
