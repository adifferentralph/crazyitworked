import { Bell } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";
import { requireRole } from "@/lib/auth/principal";

export default async function AccountNotificationsPage() {
  await requireRole(["BUYER"], "/account/notifications");

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
