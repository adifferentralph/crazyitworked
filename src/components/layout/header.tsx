import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-background/90 backdrop-blur-xl">
      <div className="container-page flex min-h-20 items-center justify-between gap-6">
        <BrandLogo />

        <nav aria-label="Primary navigation" className="hidden items-center gap-7 lg:flex">
          {siteConfig.navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Button asChild variant="ghost">
            <Link href="#how-it-works">For suppliers</Link>
          </Button>
          <Button asChild>
            <Link href="#search">
              Find a part
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <details className="group relative sm:hidden">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-xl border bg-white [&::-webkit-details-marker]:hidden">
            <Menu className="size-5" aria-hidden="true" />
            <span className="sr-only">Open navigation</span>
          </summary>
          <nav
            aria-label="Mobile navigation"
            className="absolute right-0 top-14 grid w-64 gap-1 rounded-2xl border bg-white p-3 shadow-xl"
          >
            {siteConfig.navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="#search"
              className="mt-2 rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
            >
              Find a part
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
