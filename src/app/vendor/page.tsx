import type { Metadata } from "next";
import {
  BarChart3,
  Boxes,
  FileSpreadsheet,
  Megaphone,
  MessageSquare,
  PackagePlus,
  ReceiptText,
  Users,
} from "lucide-react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Vendor Dashboard",
};

const sections = [
  {
    title: "Create Product",
    description: "Publish SKU, pricing, inventory, images, and vehicle compatibility.",
    href: "/vendor/products/new",
    icon: PackagePlus,
  },
  {
    title: "Inventory",
    description: "Edit products, stock levels, OEM references, and availability.",
    href: "/vendor/products",
    icon: Boxes,
  },
  {
    title: "CSV Uploads",
    description: "Bulk import products and compatibility rows.",
    href: "/vendor/imports",
    icon: FileSpreadsheet,
  },
  {
    title: "Orders",
    description: "Processing, shipping, pickup, disputes, and refunds.",
    href: "/vendor/orders",
    icon: ReceiptText,
  },
  {
    title: "Customers",
    description: "Buyer history, quotes, and relationship notes.",
    href: "/vendor/customers",
    icon: Users,
  },
  {
    title: "Messages",
    description: "Reply to product-linked conversations and negotiations.",
    href: "/messages",
    icon: MessageSquare,
  },
  {
    title: "Sponsored Ads",
    description: "Campaign budgets, placements, CTR, and conversions.",
    href: "/vendor/ads",
    icon: Megaphone,
  },
  {
    title: "Analytics",
    description: "Revenue, orders, conversion rate, views, and product performance.",
    href: "/vendor/analytics",
    icon: BarChart3,
  },
] as const;

export default function VendorDashboardPage() {
  return (
    <section className="container-page grid gap-6 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Vendor</p>
          <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
        </div>
        <Button asChild>
          <a href="/vendor/products/new">Add product</a>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sections.map((section) => (
          <DashboardSection key={section.href} {...section} />
        ))}
      </div>
    </section>
  );
}
