import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Gauge, Heart, LayoutDashboard, Search, Store } from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/wholesale", label: "Wholesale RFQ" },
  { href: "/vendor", label: "Sell" },
  { href: "/buyer", label: "Buyer" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container-page flex min-h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Gauge className="size-5" aria-hidden="true" />
          </span>
          <span>TorqueMart</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Search marketplace">
            <Link href="/marketplace">
              <Search className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          <SignedIn>
            <Button asChild variant="ghost" size="icon" aria-label="Saved parts">
              <Link href="/buyer/wishlist">
                <Heart className="size-5" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/vendor">
                <Store className="size-4" aria-hidden="true" />
                Vendor
              </Link>
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Dashboard">
              <Link href="/buyer">
                <LayoutDashboard className="size-5" aria-hidden="true" />
              </Link>
            </Button>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
    </header>
  );
}
