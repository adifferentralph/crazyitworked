import { MapPin } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";

export default function AccountFeaturePage() {
  return (
    <AccountSectionPage
      description="Manage the delivery and pickup details used for marketplace orders."
      emptyDescription="An address can be added securely when it is needed for fulfilment."
      emptyTitle="No addresses saved"
      icon={MapPin}
      title="Addresses"
    />
  );
}