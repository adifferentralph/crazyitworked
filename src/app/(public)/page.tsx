import type { Metadata } from "next";

import { MarketplaceHome } from "@/components/marketplace/marketplace-home";

export const metadata: Metadata = {
  description:
    "Search automotive parts by name, OEM number, brand or vehicle, browse categories, and request a part from suppliers.",
  title: "Automotive parts marketplace",
};

export default function HomePage() {
  return <MarketplaceHome />;
}
