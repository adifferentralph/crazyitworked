import { BadgeCheck } from "lucide-react";

import { OnboardingForm } from "@/components/seller/onboarding-form";
import { PickupLocations } from "@/components/seller/pickup-locations";
import { SellerShell } from "@/components/seller/seller-shell";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/principal";
import { getProductFormOptions } from "@/lib/marketplace/seller-data";
import { createClient } from "@/lib/supabase/server";
import { getDatabase } from "@/db/client";
import { sellerPickupLocations } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export default async function SellerOnboardingPage({ searchParams }: { searchParams: Promise<{ deliveryError?: string; deliveryMessage?: string }> }) {
  const principal = await requireRole(["SELLER"], "/seller/onboarding");
  const supabase = await createClient();
  const database = getDatabase();
  const [{ data: seller }, { data: verification }, { data: sellerCategories }, options, pickupLocations, query] = await Promise.all([
    supabase.from("seller_profiles").select("*").eq("user_id", principal.id).single(),
    supabase.from("seller_verifications").select("status, submitted_at, rejection_reason").eq("seller_id", principal.id).maybeSingle(),
    supabase.from("seller_categories").select("category_id").eq("seller_id", principal.id),
    getProductFormOptions(),
    database.select().from(sellerPickupLocations).where(and(eq(sellerPickupLocations.sellerId, principal.id), eq(sellerPickupLocations.isActive, true))).orderBy(sellerPickupLocations.createdAt),
    searchParams,
  ]);

  if (!seller) return null;

  return (
    <SellerShell description="Keep your trading, contact, and fulfilment details current. Formal business registration can be added later." title="Store Settings">
      <div className="mb-7 flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-[#fffdf9] p-4">
        <BadgeCheck className="size-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold text-stone-800">Store setup</span>
        <Badge variant={verification?.status === "APPROVED" ? "default" : "outline"}>
          {verification?.status === "APPROVED"
            ? "business verified"
            : verification?.status === "SUBMITTED"
              ? "business review submitted"
              : seller.onboarding_completed_at
                ? "basic profile complete"
                : "profile in progress"}
        </Badge>
        {verification?.rejection_reason ? <p className="w-full text-sm text-stone-600">Review note: {verification.rejection_reason}</p> : null}
      </div>
      <OnboardingForm categories={options.categories} defaults={{
        businessRegistrationNumber: seller.business_registration_number,
        categoryIds: (sellerCategories ?? []).map((category) => category.category_id),
        city: seller.city,
        contactPhone: seller.contact_phone,
        description: seller.description,
        state: seller.state,
        storeName: seller.store_name,
        websiteUrl: seller.website_url,
      }} />
      <PickupLocations error={query.deliveryError} locations={pickupLocations} message={query.deliveryMessage} />
    </SellerShell>
  );
}
