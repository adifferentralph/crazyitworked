import type { Metadata } from "next";

import { MarketplaceCatalog } from "@/components/marketplace/marketplace-catalog";

export const metadata: Metadata = {
  description:
    "Search approved automotive parts by name, OEM number, brand, category, location, and vehicle compatibility.",
  title: "Find an automotive part",
};

export default function FindAPartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <MarketplaceCatalog actionPath="/find-a-part" searchParams={searchParams} />;
}