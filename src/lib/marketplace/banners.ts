import "server-only";

import { createClient } from "@/lib/supabase/server";

type MarketplaceBannerPlacement = "CATEGORY" | "HOME_HERO" | "HOME_MID";

export type PublicMarketplaceBanner = {
  ctaLabel: string | null;
  ctaUrl: string | null;
  id: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  subtitle: string | null;
  title: string;
};

export async function getActiveMarketplaceBanners(
  placement: MarketplaceBannerPlacement,
): Promise<PublicMarketplaceBanner[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("marketplace_banners")
    .select("cta_label, cta_url, id, image_url, mobile_image_url, subtitle, title")
    .eq("placement", placement)
    .eq("status", "ACTIVE")
    .or(`start_at.is.null,start_at.lte.${now}`)
    .or(`end_at.is.null,end_at.gt.${now}`)
    .order("display_order")
    .order("created_at")
    .limit(20);

  if (error) return [];
  return (data ?? []).map((banner) => ({
    ctaLabel: banner.cta_label,
    ctaUrl: banner.cta_url,
    id: banner.id,
    imageUrl: banner.image_url,
    mobileImageUrl: banner.mobile_image_url,
    subtitle: banner.subtitle,
    title: banner.title,
  }));
}
