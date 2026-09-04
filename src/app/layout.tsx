import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, Space_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

import "@/app/globals.css";
import { siteConfig } from "@/config/site";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL?.trim() || siteConfig.url),
  title: {
    default: "Twenty-Two Parts | Find the right automotive part",
    template: "%s | Twenty-Two Parts",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "automotive spare parts",
    "car parts marketplace",
    "OEM parts",
    "vehicle parts",
    "wholesale auto parts",
  ],
  category: "automotive",
  openGraph: {
    title: "Twenty-Two Parts",
    description: siteConfig.description,
    siteName: siteConfig.name,
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary",
    title: "Twenty-Two Parts",
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
  },
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
        {children}
        <Analytics />
      </body>
    </html>
  );
}
