import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ApplicationHeader } from "@/components/layout/application-header";
import { getCurrentPrincipal } from "@/lib/auth/principal";
import { getBuyerCartCount } from "@/lib/marketplace/buyer-data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
};

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const principal = await getCurrentPrincipal();

  if (!principal) {
    return <main id="main-content">{children}</main>;
  }
  let cartCount = 0;
  let storeName: string | null = null;

  if (principal.role === "BUYER") {
    cartCount = await getBuyerCartCount(principal.id);
  }

  if (principal.role === "SELLER") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("seller_profiles")
      .select("store_name")
      .eq("user_id", principal.id)
      .single();
    storeName = data?.store_name ?? null;
  }

  return (
    <>
      <ApplicationHeader cartCount={cartCount} principal={principal} storeName={storeName} />
      <main className="pb-20 lg:pb-0" id="main-content">
        {children}
      </main>
    </>
  );
}