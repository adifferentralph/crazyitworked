import type { Metadata } from "next";

import { MarketplaceHome } from "@/components/marketplace/marketplace-home";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPublicMetadata({
  description:
    "Browse approved automotive parts from active suppliers and search by vehicle, category, brand, or part number.",
  path: "/marketplace",
  title: "Automotive parts marketplace",
});

export default function MarketplacePage() {
  return <MarketplaceHome />;
}
