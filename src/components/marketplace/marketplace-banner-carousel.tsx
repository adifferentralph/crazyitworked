"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Boxes,
  CarFront,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
  type LucideIcon,
} from "lucide-react";

import type { PublicMarketplaceBanner } from "@/lib/marketplace/banners";
import { cn } from "@/lib/utils";

type GuideSlide = {
  ctaLabel: string;
  ctaUrl: string;
  icon: LucideIcon;
  id: string;
  subtitle: string;
  title: string;
  tone: "black" | "cream" | "red";
};

const guideSlides: GuideSlide[] = [
  {
    ctaLabel: "Search parts",
    ctaUrl: "/find-a-part",
    icon: CarFront,
    id: "guide-search",
    subtitle: "Search by part name, OEM number, brand or vehicle.",
    title: "Find the right part for your vehicle",
    tone: "black",
  },
  {
    ctaLabel: "View categories",
    ctaUrl: "/categories",
    icon: Boxes,
    id: "guide-categories",
    subtitle: "Explore automotive parts by the system you are repairing.",
    title: "Browse automotive categories",
    tone: "cream",
  },
  {
    ctaLabel: "Request a part",
    ctaUrl: "/login?next=/account/requests/new",
    icon: FileQuestion,
    id: "guide-request",
    subtitle: "Send one structured request to relevant suppliers.",
    title: "Need a part that is not listed?",
    tone: "red",
  },
];

export function MarketplaceBannerCarousel({
  banners,
}: {
  banners: PublicMarketplaceBanner[];
}) {
  const slides = banners.length > 0 ? banners : guideSlides;
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function goTo(index: number) {
    const nextIndex = (index + slides.length) % slides.length;
    const element = carouselRef.current?.children.item(nextIndex) as HTMLElement | null;
    carouselRef.current?.scrollTo({ behavior: "smooth", left: element?.offsetLeft ?? 0 });
    setActiveIndex(nextIndex);
  }

  function updateActiveSlide() {
    const carousel = carouselRef.current;
    if (!carousel || carousel.clientWidth === 0) return;
    setActiveIndex(
      Math.min(
        slides.length - 1,
        Math.max(0, Math.round(carousel.scrollLeft / carousel.clientWidth)),
      ),
    );
  }

  return (
    <section aria-label="Marketplace highlights" className="bg-white py-4 sm:py-7">
      <div className="container-page">
        <div className="relative">
          <div
            className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto rounded-xl"
            onScroll={updateActiveSlide}
            ref={carouselRef}
          >
            {slides.map((slide, index) => {
              const isGuide = "tone" in slide;
              const GuideIcon = isGuide ? slide.icon : null;
              return (
                <article
                  aria-label={`Marketplace highlight ${index + 1} of ${slides.length}`}
                  aria-roledescription="slide"
                  className="min-w-full snap-start overflow-hidden rounded-xl border border-stone-200 bg-white"
                  key={slide.id}
                >
                  {isGuide ? (
                    <div
                      className={cn(
                        "grid min-h-52 grid-cols-[1fr_auto] items-center gap-5 p-6 sm:min-h-64 sm:p-10",
                        slide.tone === "black" && "bg-black text-white",
                        slide.tone === "cream" && "bg-[#fff8ef] text-stone-950",
                        slide.tone === "red" && "bg-primary text-white",
                      )}
                    >
                      <div className="max-w-xl">
                        <p className={cn("text-xs font-bold uppercase tracking-[0.16em]", slide.tone === "cream" ? "text-primary" : "text-orange-300")}>
                          Twenty-Two Parts
                        </p>
                        <h2 className="mt-2 font-body text-2xl font-bold leading-tight sm:text-4xl">
                          {slide.title}
                        </h2>
                        <p className={cn("mt-3 max-w-lg text-sm leading-6 sm:text-base", slide.tone === "cream" ? "text-stone-600" : "text-stone-200")}>
                          {slide.subtitle}
                        </p>
                        <Link
                          className={cn(
                            "mt-5 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                            slide.tone === "cream" ? "bg-primary text-white" : "bg-white text-stone-950",
                          )}
                          href={slide.ctaUrl}
                        >
                          {slide.ctaLabel}
                          <ArrowRight aria-hidden="true" className="size-4" />
                        </Link>
                      </div>
                      {GuideIcon ? (
                        <span className={cn("hidden size-28 place-items-center rounded-full sm:grid", slide.tone === "cream" ? "bg-primary text-white" : "bg-white/10 text-white")}>
                          <GuideIcon aria-hidden="true" className="size-14" />
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-[minmax(0,1.7fr)_minmax(240px,0.8fr)]">
                      <div className="relative aspect-[16/9] bg-stone-100 sm:aspect-auto sm:min-h-64">
                        {slide.mobileImageUrl ? (
                          <Image alt="" className="object-cover sm:hidden" fill priority={index === 0} sizes="100vw" src={slide.mobileImageUrl} />
                        ) : null}
                        <Image
                          alt=""
                          className={cn("object-cover", slide.mobileImageUrl && "hidden sm:block")}
                          fill
                          priority={index === 0}
                          sizes="(max-width: 640px) 100vw, 70vw"
                          src={slide.imageUrl}
                        />
                      </div>
                      <div className="flex flex-col justify-center p-5 sm:p-7">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Advertisement</p>
                        <h2 className="mt-2 font-body text-xl font-bold text-stone-950 sm:text-2xl">{slide.title}</h2>
                        {slide.subtitle ? <p className="mt-2 text-sm leading-6 text-stone-600">{slide.subtitle}</p> : null}
                        {slide.ctaLabel && slide.ctaUrl ? (
                          <Link className="mt-4 inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" href={slide.ctaUrl}>
                            {slide.ctaLabel}
                            <ArrowRight aria-hidden="true" className="size-4" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {slides.length > 1 ? (
            <>
              <button aria-label="Previous highlight" className="absolute left-2 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-stone-950 shadow-md focus-visible:ring-2 focus-visible:ring-primary sm:grid" onClick={() => goTo(activeIndex - 1)} type="button">
                <ChevronLeft aria-hidden="true" className="size-5" />
              </button>
              <button aria-label="Next highlight" className="absolute right-2 top-1/2 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-stone-950 shadow-md focus-visible:ring-2 focus-visible:ring-primary sm:grid" onClick={() => goTo(activeIndex + 1)} type="button">
                <ChevronRight aria-hidden="true" className="size-5" />
              </button>
              <div aria-label="Choose marketplace highlight" className="mt-3 flex justify-center gap-2" role="group">
                {slides.map((slide, index) => (
                  <button
                    aria-label={`Show highlight ${index + 1}`}
                    aria-pressed={index === activeIndex}
                    className={cn("size-2.5 rounded-full border border-primary", index === activeIndex ? "bg-primary" : "bg-white")}
                    key={slide.id}
                    onClick={() => goTo(index)}
                    type="button"
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
