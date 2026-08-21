import { Heart } from "lucide-react";

import { AccountSectionPage } from "@/components/account/account-section-page";

export default function AccountFeaturePage() {
  return (
    <AccountSectionPage
      action="Browse parts"
      actionHref="/marketplace"
      description="Keep a shortlist of parts and return when you are ready to compare or purchase."
      emptyDescription="Parts you save from marketplace results will appear here."
      emptyTitle="No saved parts"
      icon={Heart}
      title="Saved Parts"
    />
  );
}