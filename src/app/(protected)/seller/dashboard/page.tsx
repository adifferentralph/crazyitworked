import { BadgeCheck, Store } from "lucide-react";

import { AccountShell } from "@/components/auth/account-shell";
import { requireRole } from "@/lib/auth/principal";
import { createClient } from "@/lib/supabase/server";

export default async function SellerDashboardPage() {
  const principal = await requireRole(["SELLER"], "/seller/dashboard");
  const supabase = await createClient();
  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("store_name, status")
    .eq("user_id", principal.id)
    .single();

  return (
    <AccountShell
      description="Your supplier identity and review status are secured. Inventory and order tools are added in their dedicated phases."
      eyebrow="Supplier workspace"
      title={seller?.store_name ?? "Supplier account"}
    >
      <dl className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-[#fffdf9] p-5">
          <dt className="flex items-center gap-2 text-sm font-semibold text-stone-600">
            <Store className="size-4 text-primary" aria-hidden="true" />
            Business account
          </dt>
          <dd className="mt-2 text-lg font-semibold text-stone-950">
            {seller?.store_name ?? principal.fullName}
          </dd>
        </div>
        <div className="rounded-lg border border-stone-200 bg-[#fffdf9] p-5">
          <dt className="flex items-center gap-2 text-sm font-semibold text-stone-600">
            <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
            Review status
          </dt>
          <dd className="mt-2 text-lg font-semibold text-stone-950">
            {(seller?.status ?? "PENDING_VERIFICATION").replaceAll("_", " ").toLowerCase()}
          </dd>
        </div>
      </dl>
    </AccountShell>
  );
}
