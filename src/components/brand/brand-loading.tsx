import Image from "next/image";

import logo from "@/components/brand/logo.png";

export function BrandLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div
      aria-label={label}
      className="grid min-h-[60vh] place-items-center bg-white"
      role="status"
    >
      <div className="pwa-launch__mark grid place-items-center">
        <Image
          alt=""
          aria-hidden="true"
          className="size-20 object-contain"
          priority
          src={logo}
        />
        <span className="pwa-launch__accent mt-3 h-1 w-14 rounded-full bg-primary" />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
