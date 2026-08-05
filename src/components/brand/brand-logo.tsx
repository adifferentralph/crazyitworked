import Image from "next/image";
import Link from "next/link";

import logo from "@/components/brand/logo.png";
import logoForBlackSurface from "@/components/brand/logo_for_blcak_surface.png";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  inverse = false,
  priority = false,
}: {
  className?: string;
  inverse?: boolean;
  priority?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4",
        inverse ? "text-white" : "text-foreground",
        className,
      )}
      aria-label="Twenty-Two Parts home"
    >
      <Image
        src={inverse ? logoForBlackSurface : logo}
        alt=""
        className="size-12 object-contain"
        sizes="48px"
        priority={priority}
        aria-hidden="true"
      />
      <span className="font-display text-lg font-semibold tracking-tight">
        Twenty-Two <span className={inverse ? "text-accent" : "text-primary"}>Parts</span>
      </span>
    </Link>
  );
}
