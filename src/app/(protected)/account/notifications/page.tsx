import { Bell } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";

export default function AccountFeaturePage() {
  return (
    <AccountSectionPage
      description="See important marketplace, quote, and order updates."
      emptyDescription="New account and marketplace updates will appear here."
      emptyTitle="You are all caught up"
      icon={Bell}
      title="Notifications"
    />
  );
}