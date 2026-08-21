import { ClipboardList } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";

export default function AccountFeaturePage() {
  return (
    <AccountSectionPage
      action="Browse parts"
      actionHref="/marketplace"
      description="Track purchases, fulfilment, and completed orders in one place."
      emptyDescription="Your marketplace purchases will appear here with their current fulfilment status."
      emptyTitle="No orders yet"
      icon={ClipboardList}
      title="My Orders"
    />
  );
}