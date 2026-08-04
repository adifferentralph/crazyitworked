import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { siteConfig } from "@/config/site";

const audiences = [
  "Everyday drivers",
  "Repair workshops",
  "Fleet operators",
  "Parts suppliers",
] as const;

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <div>
          <BrandLogo inverse />
          <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
            Better parts discovery for the people who keep vehicles moving. Built for retail and
            business buyers across modern African markets.
          </p>
          <Link
            href="#search"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-300 hover:text-orange-200"
          >
            Start with a part request
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">Explore</h2>
          <ul className="mt-4 grid gap-3 text-sm">
            {siteConfig.navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">Built for</h2>
          <ul className="mt-4 grid gap-3 text-sm text-slate-400">
            {audiences.map((audience) => (
              <li key={audience}>{audience}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Twenty-Two Parts. All rights reserved.</p>
          <p>Landing experience · Marketplace services launching in phases.</p>
        </div>
      </div>
    </footer>
  );
}
