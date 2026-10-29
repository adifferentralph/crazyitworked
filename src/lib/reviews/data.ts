import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  orderItems,
  orders,
  productReviews,
  products,
  productTrustScores,
  trustScoreEvents,
} from "@/db/schema";
import { clampTrustScore, TRUST_SCORE } from "@/lib/trust/scoring";

export async function getPublicProductReviews(productId: string) {
  const database = getDatabase();
  const rows = await database
    .select({
      body: productReviews.body,
      createdAt: productReviews.createdAt,
      id: productReviews.id,
      rating: productReviews.rating,
      reviewerName: productReviews.reviewerName,
      title: productReviews.title,
    })
    .from(productReviews)
    .where(and(eq(productReviews.productId, productId), eq(productReviews.status, "PUBLISHED")))
    .orderBy(desc(productReviews.createdAt))
    .limit(100);
  const ratingCount = rows.length;
  const ratingValue = ratingCount
    ? rows.reduce((sum, review) => sum + review.rating, 0) / ratingCount
    : null;
  return { ratingCount, ratingValue, reviews: rows };
}

export async function getBuyerReviewOpportunities(buyerId: string) {
  return getDatabase().execute<{
    existing_review_id: string | null;
    order_item_id: string;
    product_id: string;
    product_name: string;
    product_slug: string;
  }>(sql`
    select
      order_items.id as order_item_id,
      order_items.product_id,
      order_items.product_name,
      order_items.product_slug,
      product_reviews.id as existing_review_id
    from public.order_items
    join public.orders on orders.id = order_items.order_id
    left join public.product_reviews on product_reviews.order_item_id = order_items.id
    where orders.buyer_id = ${buyerId}::uuid
      and orders.status = 'COMPLETED'
    order by orders.created_at desc
    limit 100
  `);
}

export async function createVerifiedProductReview(input: {
  body: string | null;
  buyerId: string;
  orderItemId: string;
  rating: number;
  reviewerName: string;
  title: string | null;
}) {
  const database = getDatabase();
  return database.transaction(async (transaction) => {
    const [eligible] = await transaction
      .select({ productId: orderItems.productId, productSlug: products.slug, sellerId: products.sellerId })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(and(
        eq(orderItems.id, input.orderItemId),
        eq(orders.buyerId, input.buyerId),
        eq(orders.status, "COMPLETED"),
      ))
      .limit(1);
    if (!eligible) throw new Error("REVIEW_NOT_ELIGIBLE");

    const [review] = await transaction.insert(productReviews).values({
      body: input.body,
      buyerId: input.buyerId,
      orderItemId: input.orderItemId,
      productId: eligible.productId,
      rating: input.rating,
      reviewerName: input.reviewerName,
      title: input.title,
    }).returning({ id: productReviews.id });

    if (review && input.rating >= 4) {
      const delta = TRUST_SCORE.adjustments.verifiedPositivePurchase;
      const [event] = await transaction.insert(trustScoreEvents).values({
        createdBy: input.buyerId,
        deltaHundredths: delta,
        idempotencyKey: `review:${review.id}:positive`,
        productId: eligible.productId,
        reason: "Verified positive feedback from a completed purchase",
        scope: "PRODUCT",
        sellerId: eligible.sellerId,
        sourceId: review.id,
        sourceType: "VERIFIED_PURCHASE_FEEDBACK",
      }).onConflictDoNothing({ target: trustScoreEvents.idempotencyKey }).returning({ id: trustScoreEvents.id });

      if (event) {
        await transaction.insert(productTrustScores).values({
          eventCount: 1,
          productId: eligible.productId,
          scoreHundredths: clampTrustScore(TRUST_SCORE.initialHundredths + delta),
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: productTrustScores.productId,
          set: {
            eventCount: sql`${productTrustScores.eventCount} + 1`,
            scoreHundredths: sql`greatest(100, least(500, ${productTrustScores.scoreHundredths} + ${delta}))`,
            updatedAt: new Date(),
          },
        });
      }
    }
    return eligible;
  });
}
