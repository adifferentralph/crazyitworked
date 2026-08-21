import type { ReactNode } from "react";
import Link from "next/link";
import { LayoutDashboard, Package, Plus, Store } from "lucide-react";

import { AccountShell } from "@/components/auth/account-shell";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/seller/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/seller/products", icon: Package, label: "My products" },
  { href: "/seller/onboarding", icon: Store, label: "Store profile" },
];

export function SellerShell({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <AccountShell description={description} eyebrow="Supplier workspace" title={title}>
      <div className="mb-8 flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Supplier workspace" className="flex flex-wrap gap-2">
          {links.map(({ href, icon: Icon, label }) => (
            <Button key={href} asChild size="sm" variant="ghost">
              <Link href={href}>
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </Button>
          ))}
        </nav>
        <Button asChild size="sm">
          <Link href="/seller/products/new">
            <Plus className="size-4" aria-hidden="true" />
            Add product
          </Link>
        </Button>
      </div>
      {children}
    </AccountShell>
  );
}
