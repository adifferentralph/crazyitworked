import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
};

export default function VendorAuthLayout({ children }: { children: ReactNode }) {
  return <main id="main-content">{children}</main>;
}
