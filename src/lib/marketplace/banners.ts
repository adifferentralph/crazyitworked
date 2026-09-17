import "server-only";

import {
  and,
  asc,
  eq,
  gt,
  isNull,
  lte,
  or,
  type InferSelectModel,
} from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { marketplaceBanners } from "@/db/schema";

type MarketplaceBanner = InferSelectModel<typeof marketplaceBanners>;

export type PublicMarketplaceBanner = Pick<
  MarketplaceBanner,
  "ctaLabel" | "ctaUrl" | "id" | "imageUrl" | "mobileImageUrl" | "subtitle" | "title"
>;

export async function getActiveMarketplaceBanners(
  placement: MarketplaceBanner["placement"],
): Promise<PublicMarketplaceBanner[]> {
  const now = new Date();

  return getDatabase()
    .select({
      ctaLabel: marketplaceBanners.ctaLabel,
      ctaUrl: marketplaceBanners.ctaUrl,
      id: marketplaceBanners.id,
      imageUrl: marketplaceBanners.imageUrl,
      mobileImageUrl: marketplaceBanners.mobileImageUrl,
      subtitle: marketplaceBanners.subtitle,
      title: marketplaceBanners.title,
    })
    .from(marketplaceBanners)
    .where(
      and(
        eq(marketplaceBanners.placement, placement),
        eq(marketplaceBanners.status, "ACTIVE"),
        or(isNull(marketplaceBanners.startAt), lte(marketplaceBanners.startAt, now)),
        or(isNull(marketplaceBanners.endAt), gt(marketplaceBanners.endAt, now)),
      ),
    )
    .orderBy(asc(marketplaceBanners.displayOrder), asc(marketplaceBanners.createdAt))
    .limit(20);
}
