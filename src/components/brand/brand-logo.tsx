import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  inverse = false,
}: {
  className?: string;
  inverse?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-3 rounded-sm font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4",
        inverse ? "text-white" : "text-foreground",
        className,
      )}
      aria-label="Twenty-Two Parts home"
    >
      <span
        className={cn(
          "grid size-10 place-items-center rounded-xl text-sm font-black tracking-[-0.08em]",
          inverse ? "bg-white text-slate-950" : "bg-primary text-primary-foreground",
        )}
        aria-hidden="true"
      >
        22
      </span>
      <span className="text-[1.05rem]">
        Twenty-Two <span className={inverse ? "text-orange-300" : "text-primary"}>Parts</span>
      </span>
    </Link>
  );
}
