import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { ConvexError, v } from "convex/values";

import {
  now,
  requireRole,
  requireUser,
  requireVendorOwner,
  timestamps,
  writeAuditLog,
} from "./utils";

const money = v.object({ amount: v.number(), currency: v.string() });

export const createCampaign = mutation({
  args: {
    vendorId: v.id("vendors"),
    name: v.string(),
    objective: v.union(v.literal("traffic"), v.literal("sales"), v.literal("rfq_leads")),
    dailyBudget: money,
    totalBudget: money,
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireVendorOwner(ctx, args.vendorId);
    return await ctx.db.insert("adCampaigns", {
      ...timestamps(),
      vendorId: args.vendorId,
      name: args.name,
      objective: args.objective,
      dailyBudget: args.dailyBudget,
      totalBudget: args.totalBudget,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      status: "pending_review",
    });
  },
});

export const createAd = mutation({
  args: {
    campaignId: v.id("adCampaigns"),
    productId: v.id("products"),
    placement: v.union(
      v.literal("homepage"),
      v.literal("search"),
      v.literal("category"),
      v.literal("product"),
    ),
    bidAmount: money,
  },
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    const product = await ctx.db.get(args.productId);

    if (!campaign || !product || product.vendorId !== campaign.vendorId) {
      throw new ConvexError("Campaign and product must belong to the same vendor.");
    }

    await requireVendorOwner(ctx, campaign.vendorId);

    return await ctx.db.insert("vendorAds", {
      ...timestamps(),
      campaignId: args.campaignId,
      vendorId: campaign.vendorId,
      productId: args.productId,
      placement: args.placement,
      bidAmount: args.bidAmount,
      status: "paused",
    });
  },
});

export const reviewCampaign = mutation({
  args: {
    campaignId: v.id("adCampaigns"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin", "super_admin", "moderator"]);
    const before = await ctx.db.get(args.campaignId);

    if (!before) {
      throw new ConvexError("Campaign not found.");
    }

    await ctx.db.patch(args.campaignId, {
      status: args.status,
      reviewedByUserId: actor._id,
      rejectionReason: args.rejectionReason,
      updatedAt: now(),
    });

    await writeAuditLog(ctx, {
      actorUserId: actor._id,
      action: `ad_campaign.${args.status}`,
      entityType: "adCampaign",
      entityId: args.campaignId,
      before,
      after: args,
    });
  },
});

export const listPlacement = query({
  args: {
    placement: v.union(
      v.literal("homepage"),
      v.literal("search"),
      v.literal("category"),
      v.literal("product"),
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ads = await ctx.db
      .query("vendorAds")
      .withIndex("by_placement_status", (query: any) =>
        query.eq("placement", args.placement).eq("status", "active"),
      )
      .take(args.limit ?? 12);

    return await Promise.all(
      ads
        .filter((ad) => !ad.deletedAt)
        .map(async (ad) => ({
          ad,
          product: await ctx.db.get(ad.productId),
          vendor: await ctx.db.get(ad.vendorId),
        })),
    );
  },
});

export const track = mutation({
  args: {
    adId: v.id("vendorAds"),
    eventType: v.union(v.literal("impression"), v.literal("click"), v.literal("conversion")),
    sessionId: v.string(),
    revenue: v.optional(money),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx).catch(() => null);
    const ad = await ctx.db.get(args.adId);

    if (!ad || ad.deletedAt || ad.status !== "active") {
      throw new ConvexError("Ad is not active.");
    }

    return await ctx.db.insert("adEvents", {
      ...timestamps(),
      adId: args.adId,
      campaignId: ad.campaignId,
      vendorId: ad.vendorId,
      productId: ad.productId,
      eventType: args.eventType,
      userId: user?._id,
      sessionId: args.sessionId,
      revenue: args.revenue,
    });
  },
});
