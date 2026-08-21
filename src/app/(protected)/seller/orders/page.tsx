import { ClipboardList } from "lucide-react";

import { SellerOperationPage } from "@/components/seller/seller-operation-page";
import { requireRole } from "@/lib/auth/principal";

export default async function SellerOperationRoute() {
  await requireRole(["SELLER"], "/seller/orders");
  return (
    <SellerOperationPage
      description="Manage orders received from marketplace buyers."
      emptyDescription="New customer orders will appear here after the commerce workflow is active."
      emptyTitle="No store orders yet"
      icon={ClipboardList}
      title="Store Orders"
    />
  );
}