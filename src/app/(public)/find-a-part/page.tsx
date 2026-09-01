import type { Metadata } from "next";

import { MarketplaceCatalog } from "@/components/marketplace/marketplace-catalog";
import { getCurrentPrincipal } from "@/lib/auth/principal";

export const metadata: Metadata = {
  description:
    "Search approved automotive parts by name, OEM number, brand, category, location, and vehicle compatibility.",
  title: "Find an automotive part",
};

export default async function FindAPartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await getCurrentPrincipal();
  const buyerName =
    principal?.status === "ACTIVE" && principal.role === "BUYER"
      ? principal.fullName
      : undefined;

  return (
    <MarketplaceCatalog
      actionPath="/find-a-part"
      buyerName={buyerName}
      searchParams={searchParams}
    />
  );
}
