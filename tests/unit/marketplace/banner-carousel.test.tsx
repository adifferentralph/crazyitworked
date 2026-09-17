import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MarketplaceBannerCarousel } from "@/components/marketplace/marketplace-banner-carousel";
import type { PublicMarketplaceBanner } from "@/lib/marketplace/banners";

const banners: PublicMarketplaceBanner[] = Array.from({ length: 5 }, (_, index) => ({
  ctaLabel: "View offer",
  ctaUrl: "/marketplace",
  id: `banner-${index + 1}`,
  imageUrl: `https://example.com/banner-${index + 1}.jpg`,
  mobileImageUrl: null,
  subtitle: `Offer ${index + 1}`,
  title: `Banner ${index + 1}`,
}));

describe("marketplace banner carousel", () => {
  const scrollTo = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
        removeEventListener: vi.fn(),
      }),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    scrollTo.mockReset();
  });

  it("supports more than four banners, arrows, dots, and keyboard navigation", () => {
    render(<MarketplaceBannerCarousel banners={banners} />);

    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(screen.getAllByRole("button", { name: /Show highlight/ })).toHaveLength(5);

    fireEvent.click(screen.getByRole("button", { name: "Next highlight" }));
    expect(screen.getByRole("button", { name: "Show highlight 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const carousel = screen.getByRole("region", { name: "Marketplace highlights" }).querySelector('[tabindex="0"]');
    expect(carousel).not.toBeNull();
    if (!carousel) return;
    fireEvent.keyDown(carousel, {
      key: "ArrowRight",
    });
    expect(screen.getByRole("button", { name: "Show highlight 3" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("auto-advances after six seconds and resets after a manual change", () => {
    render(<MarketplaceBannerCarousel banners={banners.slice(0, 4)} />);

    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole("button", { name: "Show highlight 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Show highlight 4" }));
    act(() => vi.advanceTimersByTime(5999));
    expect(screen.getByRole("button", { name: "Show highlight 4" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("button", { name: "Show highlight 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("does not autoplay when reduced motion is requested", () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    });

    render(<MarketplaceBannerCarousel banners={banners.slice(0, 2)} />);
    act(() => vi.advanceTimersByTime(12000));

    expect(screen.getByRole("button", { name: "Show highlight 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
