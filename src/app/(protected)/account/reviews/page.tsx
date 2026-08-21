import { Star } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";

export default function AccountFeaturePage() {
  return (
    <AccountSectionPage
      description="Share fitment and product feedback for eligible completed purchases."
      emptyDescription="Completed purchases that are eligible for review will appear here."
      emptyTitle="No reviews yet"
      icon={Star}
      title="My Reviews"
    />
  );
}