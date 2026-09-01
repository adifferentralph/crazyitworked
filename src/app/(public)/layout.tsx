import type { ReactNode } from "react";

import { ApplicationHeader } from "@/components/layout/application-header";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MobileMarketplaceNavigation } from "@/components/marketplace/mobile-marketplace-navigation";
import { getCurrentPrincipal } from "@/lib/auth/principal";
import { getBuyerCartCount } from "@/lib/marketplace/buyer-data";
import { createClient } from "@/lib/supabase/server";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const principal = await getCurrentPrincipal();
  let cartCount = 0;
  let storeName: string | null = null;

  if (principal?.role === "BUYER") {
    cartCount = await getBuyerCartCount(principal.id);
  }

  if (principal?.role === "SELLER") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("seller_profiles")
      .select("store_name")
      .eq("user_id", principal.id)
      .single();
    storeName = data?.store_name ?? null;
  }

  if (principal?.status === "ACTIVE") {
    return (
      <>
        <ApplicationHeader cartCount={cartCount} principal={principal} storeName={storeName} />
        <main className="pb-20 lg:pb-0" id="main-content">
          {children}
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="pb-20 lg:pb-0">
        <main id="main-content">{children}</main>
        <Footer />
      </div>
      <MobileMarketplaceNavigation />
    </>
  );
}
