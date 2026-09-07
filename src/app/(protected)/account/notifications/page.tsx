import { Bell } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { getPushPublicKey } from "@/config/env";
import { requireRole } from "@/lib/auth/principal";
import { listUserNotifications } from "@/lib/notifications/push";

export default async function AccountNotificationsPage() {
  const principal = await requireRole(["BUYER"], "/account/notifications");
  const notifications = await listUserNotifications(principal.id);

  return (
    <AccountSectionPage
      description="See important marketplace, quote, and order updates."
      icon={Bell}
      title="Notifications"
    >
      <NotificationCenter notifications={notifications} publicKey={getPushPublicKey()} />
    </AccountSectionPage>
  );
}
