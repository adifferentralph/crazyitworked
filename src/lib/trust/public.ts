import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  foundingMerchantAwards,
  manualSellerVerifications,
  productTrustScores,
} from "@/db/schema";
import { displayTrustScore } from "@/lib/trust/scoring";

export type PublicSellerRecognition = {
  foundingPosition: number | null;
  foundingTwenty: boolean;
  verifiedSeller: boolean;
};

const emptyRecognition: PublicSellerRecognition = {
  foundingPosition: null,
  foundingTwenty: false,
  verifiedSeller: false,
};

export async function getPublicTrustForProducts(productIds: string[], sellerIds: string[]) {
  if (!productIds.length && !sellerIds.length) {
    return {
      recognitionBySeller: new Map<string, PublicSellerRecognition>(),
      scoreByProduct: new Map<string, number>(),
    };
  }

  const database = getDatabase();
  const [scores, verifications, awards] = await Promise.all([
    productIds.length
      ? database
          .select({ productId: productTrustScores.productId, score: productTrustScores.scoreHundredths })
          .from(productTrustScores)
          .where(inArray(productTrustScores.productId, productIds))
      : [],
    sellerIds.length
      ? database
          .select({ sellerId: manualSellerVerifications.sellerId })
          .from(manualSellerVerifications)
          .where(
            and(
              inArray(manualSellerVerifications.sellerId, sellerIds),
              eq(manualSellerVerifications.status, "VERIFIED"),
            ),
          )
      : [],
    sellerIds.length
      ? database
          .select({ position: foundingMerchantAwards.position, sellerId: foundingMerchantAwards.sellerId })
          .from(foundingMerchantAwards)
          .where(
            and(
              inArray(foundingMerchantAwards.sellerId, sellerIds),
              isNull(foundingMerchantAwards.revokedAt),
            ),
          )
      : [],
  ]);

  const verified = new Set(verifications.map((row) => row.sellerId));
  const founding = new Map(awards.map((row) => [row.sellerId, row.position]));

  return {
    recognitionBySeller: new Map(
      sellerIds.map((sellerId) => {
        const position = founding.get(sellerId) ?? null;
        return [
          sellerId,
          {
            foundingPosition: position,
            foundingTwenty: position !== null,
            verifiedSeller: verified.has(sellerId),
          },
        ];
      }),
    ),
    scoreByProduct: new Map(
      productIds.map((productId) => {
        const score = scores.find((row) => row.productId === productId)?.score;
        return [productId, displayTrustScore(score)];
      }),
    ),
  };
}

export async function getPublicSellerRecognition(sellerId: string) {
  const { recognitionBySeller } = await getPublicTrustForProducts([], [sellerId]);
  return recognitionBySeller.get(sellerId) ?? emptyRecognition;
}
