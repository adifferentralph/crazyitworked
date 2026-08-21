import { Star } from "lucide-react";

import { SellerOperationPage } from "@/components/seller/seller-operation-page";
import { requireRole } from "@/lib/auth/principal";

export default async function SellerOperationRoute() {
  await requireRole(["SELLER"], "/seller/reviews");
  return (
    <SellerOperationPage
      description="See verified-purchase feedback for your fulfilled products."
      emptyDescription="Eligible buyer reviews will appear here after completed purchases."
      emptyTitle="No store reviews yet"
      icon={Star}
      title="Store Reviews"
    />
  );
}