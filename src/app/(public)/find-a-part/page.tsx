import type { Metadata } from "next";

import { MarketplaceCatalog } from "@/components/marketplace/marketplace-catalog";
import { getCurrentPrincipal } from "@/lib/auth/principal";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  ...createPublicMetadata({
    description:
      "Search approved automotive parts by name, OEM number, brand, category, location, and vehicle compatibility.",
    path: "/find-a-part",
    title: "Find an automotive part",
  }),
  robots: { follow: true, index: false },
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
