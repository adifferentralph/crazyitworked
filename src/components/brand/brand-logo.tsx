import Image from "next/image";
import Link from "next/link";

import logo from "@/components/brand/logo.png";
import logoForBlackSurface from "@/components/brand/logo_for_blcak_surface.png";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  compact = false,
  href = "/",
  inverse = false,
  priority = false,
}: {
  className?: string;
  compact?: boolean;
  href?: string;
  inverse?: boolean;
  priority?: boolean;
}) {
  return (
    <Link
      aria-label="Twenty-Two Parts home"
      className={cn(
        "inline-flex items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4",
        compact ? "gap-2" : "gap-3",
        inverse ? "text-white" : "text-foreground",
        className,
      )}
      href={href}
    >
      <Image
        alt=""
        aria-hidden="true"
        className={cn("object-contain", compact ? "size-9" : "size-12")}
        priority={priority}
        sizes={compact ? "36px" : "48px"}
        src={inverse ? logoForBlackSurface : logo}
      />
      <span
        className={cn(
          "font-display font-semibold tracking-tight",
          compact ? "text-sm leading-tight min-[375px]:text-base" : "text-lg",
        )}
      >
        Twenty-Two{" "}
        <span className={inverse ? "text-accent" : "text-primary"}>
          Parts
        </span>
      </span>
    </Link>
  );
}
