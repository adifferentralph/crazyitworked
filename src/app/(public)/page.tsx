import type { Metadata } from "next";

import { MarketplaceHome } from "@/components/marketplace/marketplace-home";
import { siteConfig } from "@/config/site";
import { JsonLd } from "@/lib/seo/json-ld";
import { createPublicMetadata } from "@/lib/seo/metadata";

const description =
  "Search automotive parts by name, OEM number, brand or vehicle, browse categories, and request a part from suppliers.";

export const metadata: Metadata = createPublicMetadata({
  description,
  path: "/",
  title: "Automotive parts marketplace",
});

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            logo: `${siteConfig.url}/logo-email.png`,
            name: siteConfig.name,
            url: siteConfig.url,
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteConfig.name,
            potentialAction: {
              "@type": "SearchAction",
              "query-input": "required name=search_term_string",
              target: `${siteConfig.url}/find-a-part?q={search_term_string}`,
            },
            url: siteConfig.url,
          },
        ]}
      />
      <MarketplaceHome />
    </>
  );
}
