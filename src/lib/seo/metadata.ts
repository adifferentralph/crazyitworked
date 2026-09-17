import type { Metadata } from "next";

import { siteConfig } from "@/config/site";

export const defaultOgImage = {
  alt: "Twenty-Two Parts automotive spare parts marketplace",
  height: 1200,
  url: `${siteConfig.url}/og-image.png`,
  width: 2100,
} as const;

export function getCanonicalUrl(path: string) {
  return new URL(path, `${siteConfig.url}/`).toString();
}

export function createPublicMetadata({
  description,
  path,
  title,
}: {
  description: string;
  path: string;
  title: string;
}): Metadata {
  const url = getCanonicalUrl(path);
  const socialTitle = `${title} | ${siteConfig.name}`;

  return {
    alternates: { canonical: url },
    description,
    openGraph: {
      description,
      images: [defaultOgImage],
      locale: "en_NG",
      siteName: siteConfig.name,
      title: socialTitle,
      type: "website",
      url,
    },
    robots: { follow: true, index: true },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [defaultOgImage.url],
      title: socialTitle,
    },
  };
}
