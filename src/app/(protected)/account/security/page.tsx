import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";
import { BuyerProfileForm } from "@/components/account/buyer-profile-form";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/principal";
import { createClient } from "@/lib/supabase/server";

export default async function SecurityPage() {
  const principal = await requireRole(["BUYER"], "/account/security");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("buyer_profiles")
    .select("account_type, organization_name, business_registration_number")
    .eq("user_id", principal.id)
    .single();

  return (
    <AccountSectionPage
      description="Keep your sourcing profile accurate and use Supabase's secure password-recovery flow when needed."
      icon={LockKeyhole}
      title="Profile & Security"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-xl border border-stone-200 bg-white p-5 sm:p-7">
          <h2 className="text-xl font-semibold text-stone-950">Buyer profile</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">Your account type helps Twenty-Two Parts support individual, workshop, fleet, and corporate sourcing workflows.</p>
          <div className="mt-6">
            <BuyerProfileForm
              accountType={profile?.account_type ?? "INDIVIDUAL"}
              businessRegistrationNumber={profile?.business_registration_number ?? null}
              organizationName={profile?.organization_name ?? null}
            />
          </div>
        </div>
        <aside className="h-fit rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="font-body text-lg font-bold text-stone-950">Sign-in details</h2>
          <dl className="mt-4 grid gap-4 text-sm">
            <div>
              <dt className="font-semibold text-stone-500">Name</dt>
              <dd className="mt-1 font-semibold text-stone-950">{principal.fullName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-stone-500">Email address</dt>
              <dd className="mt-1 break-all font-semibold text-stone-950">{principal.email}</dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-stone-200 pt-5">
            <Button asChild variant="outline">
              <Link href="/forgot-password">Reset password securely</Link>
            </Button>
          </div>
        </aside>
      </div>
    </AccountSectionPage>
  );
}