import { MarketplaceCatalog } from "@/components/marketplace/marketplace-catalog";
import { getCurrentPrincipal } from "@/lib/auth/principal";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await getCurrentPrincipal();
  const buyer =
    principal?.status === "ACTIVE" && principal.role === "BUYER"
      ? principal
      : null;

  return (
    <MarketplaceCatalog
      actionPath="/marketplace"
      buyerId={buyer?.id}
      buyerName={buyer?.fullName}
      searchParams={searchParams}
    />
  );
}
