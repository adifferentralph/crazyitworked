import { CarFront } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";

export default function AccountFeaturePage() {
  return (
    <AccountSectionPage
      action="Choose a vehicle"
      actionHref="/marketplace"
      description="Keep multiple personal or customer vehicles ready for accurate part searches."
      emptyDescription="Select an exact vehicle while searching. You will be able to save it here for faster repeat searches."
      emptyTitle="No saved vehicles"
      icon={CarFront}
      title="Saved Vehicles"
    />
  );
}