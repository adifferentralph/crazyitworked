import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

import "@/app/globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
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
    card: "summary_large_image",
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
      <body>
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
