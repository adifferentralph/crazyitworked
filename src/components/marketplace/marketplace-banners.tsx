import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getActiveMarketplaceBanners } from "@/lib/marketplace/banners";

export async function MarketplaceBanners({ placement }: { placement: "HOME_HERO" | "HOME_MID" | "CATEGORY" }) {
  const banners = await getActiveMarketplaceBanners(placement);
  if (banners.length === 0) return null;

  return (
    <section aria-label="Marketplace promotions" className="py-5 sm:py-8">
      <div className="container-page grid gap-4">
        {banners.map((banner) => (
          <article className="overflow-hidden rounded-xl border border-stone-200 bg-white" key={banner.id}>
            <div className="grid sm:grid-cols-[minmax(0,1.7fr)_minmax(240px,0.8fr)]">
              <div className="relative aspect-[16/7] bg-stone-100 sm:aspect-auto sm:min-h-56">
                {banner.mobileImageUrl ? (
                  <Image alt="" className="object-cover sm:hidden" fill priority={placement === "HOME_HERO"} sizes="100vw" src={banner.mobileImageUrl} />
                ) : null}
                <Image alt="" className={`object-cover ${banner.mobileImageUrl ? "hidden sm:block" : ""}`} fill priority={placement === "HOME_HERO"} sizes="(max-width: 640px) 100vw, 70vw" src={banner.imageUrl} />
              </div>
              <div className="flex flex-col justify-center p-5 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Advertisement</p>
                <h2 className="mt-2 text-xl font-bold text-stone-950 sm:text-2xl">{banner.title}</h2>
                {banner.subtitle ? <p className="mt-2 text-sm leading-6 text-stone-600">{banner.subtitle}</p> : null}
                {banner.ctaLabel && banner.ctaUrl ? (
                  <Link className="mt-4 inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700" href={banner.ctaUrl}>
                    {banner.ctaLabel}<ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
