import Link from "next/link";
import {
  ArrowUpRight,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white">
      <div className="container-page flex min-h-16 items-center justify-between gap-2 sm:min-h-20 sm:gap-6">
        <BrandLogo compact priority />

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-7 lg:flex"
        >
          {siteConfig.navigation.map((item) => (
            <Link
              className="text-sm font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost">
            <Link href={siteConfig.auth.suppliers}>
              <Store aria-hidden="true" className="size-4" />
              For suppliers
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/find-a-part">
              Find a part
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        </div>

        <nav
          aria-label="Mobile account shortcuts"
          className="ml-auto flex shrink-0 items-center gap-1 lg:hidden"
        >
          <Link
            aria-label="Sign in or open account"
            className="grid size-10 place-items-center rounded-md text-stone-700 focus-visible:ring-2 focus-visible:ring-primary"
            href="/login"
          >
            <UserRound aria-hidden="true" className="size-5" />
          </Link>
          <Link
            aria-label="Open cart"
            className="grid size-10 place-items-center rounded-md text-stone-700 focus-visible:ring-2 focus-visible:ring-primary"
            href="/login?next=/cart"
          >
            <ShoppingCart aria-hidden="true" className="size-5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
