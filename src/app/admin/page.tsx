import type { Metadata } from "next";
import {
  BadgeCheck,
  ChartNoAxesCombined,
  ClipboardList,
  Flag,
  FolderTree,
  Megaphone,
  Scale,
  ShieldAlert,
  UsersRound,
} from "lucide-react";

import { DashboardSection } from "@/components/dashboard/dashboard-section";

export const metadata: Metadata = {
  title: "Admin Panel",
};

const sections = [
  {
    title: "Vendor Approval",
    description: "Verification documents, business identity, and approval decisions.",
    href: "/admin/vendors",
    icon: BadgeCheck,
  },
  {
    title: "Users",
    description: "Roles, suspensions, support status, and account health.",
    href: "/admin/users",
    icon: UsersRound,
  },
  {
    title: "Product Moderation",
    description: "Pending listings, rejected content, and category enforcement.",
    href: "/admin/moderation",
    icon: Flag,
  },
  {
    title: "Categories",
    description: "Automotive taxonomy and storefront ordering.",
    href: "/admin/categories",
    icon: FolderTree,
  },
  {
    title: "Ads",
    description: "Campaign approvals, spend controls, and placement health.",
    href: "/admin/ads",
    icon: Megaphone,
  },
  {
    title: "Revenue",
    description: "Marketplace fees, subscriptions, and sponsored listing income.",
    href: "/admin/revenue",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Disputes",
    description: "Escrow-ready order disputes and refund review.",
    href: "/admin/disputes",
    icon: Scale,
  },
  {
    title: "Fraud Monitoring",
    description: "Velocity checks, suspicious listings, and account flags.",
    href: "/admin/fraud",
    icon: ShieldAlert,
  },
  {
    title: "Audit Logs",
    description: "Immutable marketplace operations trail.",
    href: "/admin/audit-logs",
    icon: ClipboardList,
  },
] as const;

export default function AdminDashboardPage() {
  return (
    <section className="container-page grid gap-6 py-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Panel</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <DashboardSection key={section.href} {...section} />
        ))}
      </div>
    </section>
  );
}
