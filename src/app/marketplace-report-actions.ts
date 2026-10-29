"use server";

import { and, count, eq, gte } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db/client";
import { marketplaceReports, products, sellerProfiles } from "@/db/schema";
import { requirePrincipal } from "@/lib/auth/principal";

const productReasons = [
  "MISLEADING_DESCRIPTION",
  "SUSPECTED_COUNTERFEIT",
  "INCORRECT_COMPATIBILITY",
  "MISLEADING_PRICING",
  "UNAVAILABLE",
  "SUSPICIOUS_LISTING",
  "OTHER",
] as const;

const merchantReasons = [
  "SUSPECTED_FRAUD",
  "MISLEADING_BUSINESS_INFORMATION",
  "FAILED_FULFILMENT",
  "UNPROFESSIONAL_CONDUCT",
  "COUNTERFEIT_CONCERNS",
  "SUSPICIOUS_ACTIVITY",
  "OTHER",
] as const;

const reportSchema = z.object({
  explanation: z.string().trim().max(2000).optional(),
  reason: z.string().trim().min(1),
});

export type MarketplaceReportState = {
  error?: string;
  success?: string;
};

export async function submitMarketplaceReportAction(
  context: { productId: string; sellerId: string; targetType: "PRODUCT" | "MERCHANT" },
  _previousState: MarketplaceReportState,
  formData: FormData,
): Promise<MarketplaceReportState> {
  const principal = await requirePrincipal(`/parts/${String(formData.get("productSlug") ?? "")}`);
  const parsed = reportSchema.safeParse({
    explanation: formData.get("explanation") || undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: "Choose a reason and try again." };

  const allowedReasons = context.targetType === "PRODUCT" ? productReasons : merchantReasons;
  if (!new Set<string>(allowedReasons).has(parsed.data.reason)) {
    return { error: "Choose a valid report reason." };
  }

  const database = getDatabase();
  const [seller] = await database
    .select({ sellerId: sellerProfiles.userId })
    .from(sellerProfiles)
    .where(eq(sellerProfiles.userId, context.sellerId))
    .limit(1);
  if (!seller) return { error: "That merchant is no longer available." };
  if (principal.id === context.sellerId) return { error: "You cannot report your own store or product." };

  if (context.targetType === "PRODUCT") {
    const [product] = await database
      .select({ sellerId: products.sellerId })
      .from(products)
      .where(and(eq(products.id, context.productId), eq(products.sellerId, context.sellerId)))
      .limit(1);
    if (!product) return { error: "That product is no longer available." };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [recent] = await database
    .select({ value: count() })
    .from(marketplaceReports)
    .where(
      and(
        eq(marketplaceReports.reporterId, principal.id),
        gte(marketplaceReports.createdAt, oneHourAgo),
      ),
    );
  if ((recent?.value ?? 0) >= 5) {
    return { error: "You have sent several reports recently. Please try again later." };
  }

  const targetKey = context.targetType === "PRODUCT"
    ? `product:${context.productId}`
    : `merchant:${context.sellerId}`;
  try {
    await database.insert(marketplaceReports).values({
      explanation: parsed.data.explanation || null,
      productId: context.targetType === "PRODUCT" ? context.productId : null,
      reason: parsed.data.reason,
      reporterId: principal.id,
      sellerId: context.sellerId,
      targetKey,
      targetType: context.targetType,
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "23505") return { error: "You already have a pending report for this item." };
    if (code === "P0001") return { error: "You have sent several reports recently. Please try again later." };
    console.error("Marketplace report submission failed", error);
    return { error: "We could not send your report. Please try again." };
  }

  return { success: "Report sent. Our moderation team will review it." };
}
