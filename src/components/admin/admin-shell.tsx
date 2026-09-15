"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BadgeDollarSign,
  Bell,
  Boxes,
  Building2,
  ClipboardCheck,
  FileQuestion,
  GalleryHorizontal,
  Gavel,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  PackageSearch,
  ReceiptText,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  WalletCards,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/products", icon: PackageSearch, label: "Products" },
  { href: "/admin/approvals", icon: ClipboardCheck, label: "Listings / Approvals" },
  { href: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { href: "/admin/sellers", icon: Store, label: "Sellers" },
  { href: "/admin/customers", icon: Users, label: "Buyers / Customers" },
  { href: "/admin/requests", icon: FileQuestion, label: "Part Requests / RFQs" },
  { href: "/admin/banners", icon: GalleryHorizontal, label: "Ads / Banners" },
  { href: "/admin/reviews", icon: ListChecks, label: "Reviews" },
  { href: "/admin/disputes", icon: Scale, label: "Disputes" },
  { href: "/admin/finance", icon: BadgeDollarSign, label: "Finance" },
  { href: "/admin/held-funds", icon: WalletCards, label: "Held Funds" },
  { href: "/admin/withdrawals", icon: ReceiptText, label: "Withdrawals" },
  { href: "/admin/vehicle-catalogue", icon: Building2, label: "Vehicle Catalogue" },
  { href: "/admin/fitment-intelligence", icon: Activity, label: "Fitment" },
  { href: "/admin/inventory-onboarding", icon: Boxes, label: "Inventory onboarding" },
  { href: "/admin/marketing/audience", icon: Megaphone, label: "Marketing Audience" },
  { href: "/admin/notifications", icon: Bell, label: "Notifications" },
  { href: "/admin/permissions", icon: KeyRound, label: "Permissions" },
  { href: "/admin/audit-logs", icon: Gavel, label: "Audit Logs" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
  { href: "/admin/security", icon: ShieldCheck, label: "Security" },
] as const;

function AdminNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin operations"
      className={mobile ? "overflow-x-auto border-y border-stone-200 bg-white py-2 lg:hidden" : "grid gap-1"}
    >
      <div className={mobile ? "flex min-w-max gap-1 px-4" : "contents"}>
        {navigation.map(({ href, icon: Icon, label }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold",
                active ? "bg-red-50 text-primary" : "text-stone-700 hover:bg-stone-100 hover:text-stone-950",
              )}
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AdminShell({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <>
      <AdminNavigation mobile />
      <div className="container-page py-6 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-lg border border-stone-200 bg-white p-3">
              <AdminNavigation />
            </div>
          </aside>
          <main className="min-w-0">
            <div className="mb-7 border-b border-stone-200 pb-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Admin operations</p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-stone-950 sm:text-4xl">{title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p>
            </div>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
