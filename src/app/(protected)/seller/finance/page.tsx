import { WalletCards } from "lucide-react";

import { SellerOperationPage } from "@/components/seller/seller-operation-page";
import { requireRole } from "@/lib/auth/principal";

export default async function SellerOperationRoute() {
  await requireRole(["SELLER"], "/seller/finance");
  return (
    <SellerOperationPage
      description="Review store transaction and payout records without exposing buyer financial tools."
      emptyDescription="Verified marketplace transactions will appear here when orders begin."
      emptyTitle="No financial activity"
      icon={WalletCards}
      title="Finance"
    />
  );
}