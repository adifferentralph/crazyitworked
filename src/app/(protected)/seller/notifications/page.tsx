import { NotificationCenter } from "@/components/notifications/notification-center";
import { SellerShell } from "@/components/seller/seller-shell";
import { getPushPublicKey } from "@/config/env";
import { requireRole } from "@/lib/auth/principal";
import { listUserNotifications } from "@/lib/notifications/push";

export default async function SellerNotificationsPage() {
  const principal = await requireRole(["SELLER"], "/seller/notifications");
  const notifications = await listUserNotifications(principal.id);

  return (
    <SellerShell
      description="See listing review, inventory, request, and order updates."
      title="Notifications"
    >
      <NotificationCenter notifications={notifications} publicKey={getPushPublicKey()} />
    </SellerShell>
  );
}
