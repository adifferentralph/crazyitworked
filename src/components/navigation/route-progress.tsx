"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.href === window.location.href || destination.hash) return;
      setPending(true);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timeout = window.setTimeout(() => setPending(false), 12_000);
    return () => window.clearTimeout(timeout);
  }, [pending]);

  return pending ? (
    <div
      aria-label="Loading page"
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-1 overflow-hidden bg-red-100"
      role="status"
    >
      <span className="route-progress__bar block h-full w-1/3 bg-primary" />
    </div>
  ) : null;
}
