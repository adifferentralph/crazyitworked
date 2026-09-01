import type { Metadata } from "next";

import { MarketplaceHome } from "@/components/marketplace/marketplace-home";

export const metadata: Metadata = {
  description:
    "Search approved automotive parts, find listings for your vehicle, browse categories, and request a part from suppliers.",
  title: "Automotive parts marketplace",
};

export default function HomePage() {
  return <MarketplaceHome />;
}
