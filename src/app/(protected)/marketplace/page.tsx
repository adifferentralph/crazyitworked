import { MarketplaceCatalog } from "@/components/marketplace/marketplace-catalog";
import { requireRole } from "@/lib/auth/principal";

export default async function BuyerMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requireRole(["BUYER"], "/marketplace");

  return (
    <MarketplaceCatalog
      actionPath="/marketplace"
      buyerName={principal.fullName}
      searchParams={searchParams}
    />
  );
}