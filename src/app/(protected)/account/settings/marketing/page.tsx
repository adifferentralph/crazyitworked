import { Mail } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";
import { MarketingPreferenceForm } from "@/components/account/marketing-preference-form";
import { requireRole } from "@/lib/auth/principal";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingSettingsPage() {
  const principal = await requireRole(["BUYER"], "/account/settings/marketing");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("buyer_profiles")
    .select("marketing_opt_in")
    .eq("user_id", principal.id)
    .single();

  return (
    <AccountSectionPage
      description="Choose whether to receive optional marketplace news. Transactional account and order messages are separate."
      icon={Mail}
      title="Marketing preferences"
    >
      <div className="max-w-2xl">
        <MarketingPreferenceForm marketingOptIn={profile?.marketing_opt_in ?? false} />
      </div>
    </AccountSectionPage>
  );
}
