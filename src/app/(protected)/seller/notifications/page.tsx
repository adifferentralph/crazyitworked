import { Bell } from "lucide-react";

import { SellerOperationPage } from "@/components/seller/seller-operation-page";
import { requireRole } from "@/lib/auth/principal";

export default async function SellerOperationRoute() {
  await requireRole(["SELLER"], "/seller/notifications");
  return (
    <SellerOperationPage
      description="See listing review, inventory, request, and order updates."
      emptyDescription="New operational updates will appear here."
      emptyTitle="You are all caught up"
      icon={Bell}
      title="Notifications"
    />
  );
}