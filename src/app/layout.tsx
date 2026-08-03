import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";

import "@/app/globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "TorqueMart | Automotive Parts Marketplace",
    template: "%s | TorqueMart",
  },
  description:
    "A multi-vendor automotive parts marketplace for retail buyers, wholesale buyers, vendors, and marketplace operators across African markets.",
  openGraph: {
    title: "TorqueMart",
    description: "Find compatible parts, negotiate with vendors, and source wholesale inventory.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <AppProviders>
            <Header />
            <main>{children}</main>
            <Footer />
            <Analytics />
          </AppProviders>
        </body>
      </html>
    </ClerkProvider>
  );
}
