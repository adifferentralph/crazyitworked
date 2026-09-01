"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileQuestion,
  Grid2X2,
  House,
  ShoppingCart,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import {
  getMarketplaceNavigationKey,
  type MarketplaceNavigationKey,
} from "@/lib/marketplace/navigation";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  icon: LucideIcon;
  key: MarketplaceNavigationKey;
  label: string;
};

export function MobileMarketplaceNavigation({
  authenticated = false,
  cartCount = 0,
}: {
  authenticated?: boolean;
  cartCount?: number;
}) {
  const pathname = usePathname();
  const activeKey = getMarketplaceNavigationKey(pathname);
  const items: NavigationItem[] = [
    { href: "/", icon: House, key: "home", label: "Home" },
    {
      href: "/categories",
      icon: Grid2X2,
      key: "categories",
      label: "Categories",
    },
    {
      href: authenticated
        ? "/account/requests"
        : "/login?next=/account/requests",
      icon: FileQuestion,
      key: "requests",
      label: "Requests",
    },
    {
      href: authenticated ? "/cart" : "/login?next=/cart",
      icon: ShoppingCart,
      key: "cart",
      label: "Cart",
    },
    {
      href: authenticated ? "/account" : "/login",
      icon: UserRound,
      key: "account",
      label: "Account",
    },
  ];

  return (
    <nav
      aria-label="Mobile marketplace navigation"
      className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-stone-200 bg-white px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_-20px_rgba(0,0,0,0.5)] lg:hidden"
    >
      {items.map(({ href, icon: Icon, key, label }) => {
        const active = key === activeKey;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-w-0 flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active ? "text-primary" : "text-stone-600",
            )}
            href={href}
            key={key}
          >
            <Icon aria-hidden="true" className="size-5" />
            <span className="max-w-full truncate">{label}</span>
            {key === "cart" && cartCount > 0 ? (
              <span
                aria-label={`${cartCount} items in cart`}
                className="absolute left-1/2 top-0 min-w-4 rounded-full bg-primary px-1 text-center text-[9px] leading-4 text-white"
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
            {active ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 -top-1 h-0.5 rounded-full bg-primary"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
