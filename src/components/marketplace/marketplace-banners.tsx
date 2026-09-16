import { MarketplaceBannerCarousel } from "@/components/marketplace/marketplace-banner-carousel";
import { getActiveMarketplaceBanners } from "@/lib/marketplace/banners";

export async function MarketplaceBanners({
  placement,
}: {
  placement: "HOME_HERO" | "HOME_MID" | "CATEGORY";
}) {
  const banners = await getActiveMarketplaceBanners(placement);
  if (banners.length === 0 && placement !== "HOME_HERO") return null;

  return <MarketplaceBannerCarousel banners={banners} />;
}
