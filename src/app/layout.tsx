import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display, Space_Mono } from "next/font/google";
import { CookieConsentManager } from "@/components/privacy/cookie-consent-manager";

import "@/app/globals.css";
import { PwaClient } from "@/components/pwa/pwa-client";
import { siteConfig } from "@/config/site";
import { defaultOgImage } from "@/lib/seo/metadata";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  alternates: { canonical: siteConfig.url },
  title: {
    default: "Twenty-Two Parts | Find the right automotive part",
    template: "%s | Twenty-Two Parts",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { sizes: "32x32", type: "image/x-icon", url: "/favicon.ico?v=20260907" },
      { sizes: "32x32", type: "image/png", url: "/icon.png?v=20260907" },
    ],
    shortcut: "/favicon.ico?v=20260907",
  },
  keywords: [
    "automotive spare parts",
    "car parts marketplace",
    "OEM parts",
    "vehicle parts",
    "wholesale auto parts",
  ],
  category: "automotive",
  openGraph: {
    title: "Twenty-Two Parts | Automotive spare parts marketplace",
    description: siteConfig.description,
    images: [defaultOgImage],
    siteName: siteConfig.name,
    type: "website",
    locale: "en_NG",
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    title: "Twenty-Two Parts | Automotive spare parts marketplace",
    description: siteConfig.description,
    images: [defaultOgImage.url],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: process.env.GOOGLE_SITE_VERIFICATION?.trim()
    ? { google: process.env.GOOGLE_SITE_VERIFICATION.trim() }
    : undefined,
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#e30613",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <PwaClient />
        {children}
        <CookieConsentManager />
      </body>
    </html>
  );
}
