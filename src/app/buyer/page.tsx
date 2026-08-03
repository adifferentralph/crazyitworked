import type { Metadata } from "next";
import { Car, FileText, Heart, MessageSquare, PackageSearch, Star, UserRound } from "lucide-react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";

export const metadata: Metadata = {
  title: "Buyer Dashboard",
};

const sections = [
  {
    title: "Profile",
    description: "Identity, phone, billing, and shipping addresses.",
    href: "/buyer/profile",
    icon: UserRound,
  },
  {
    title: "Saved Vehicles",
    description: "Vehicle garage used by fitment-aware search.",
    href: "/buyer/vehicles",
    icon: Car,
  },
  {
    title: "Saved Parts",
    description: "Wishlist entries and watched listings.",
    href: "/buyer/wishlist",
    icon: Heart,
  },
  {
    title: "Orders",
    description: "Retail and RFQ order tracking.",
    href: "/buyer/orders",
    icon: PackageSearch,
  },
  {
    title: "Messages",
    description: "Vendor chat, negotiations, and attachments.",
    href: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Invoices",
    description: "Downloadable order and payment documents.",
    href: "/buyer/invoices",
    icon: FileText,
  },
  {
    title: "Reviews",
    description: "Published and pending product reviews.",
    href: "/buyer/reviews",
    icon: Star,
  },
] as const;

export default function BuyerDashboardPage() {
  return (
    <section className="container-page grid gap-6 py-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Buyer</p>
        <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <DashboardSection key={section.href} {...section} />
        ))}
      </div>
    </section>
  );
}
