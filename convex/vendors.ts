import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import { now, requireUser, requireVendorOwner, timestamps, writeAuditLog } from "./utils";

const address = v.object({
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  country: v.string(),
  postalCode: v.optional(v.string()),
});

const fulfillmentModes = v.array(
  v.union(v.literal("pickup"), v.literal("delivery"), v.literal("interstate_shipping")),
);

export const myVendors = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("vendors")
      .withIndex("by_owner", (query) => query.eq("ownerUserId", user._id))
      .collect()
      .then((rows) => rows.filter((row) => !row.deletedAt));
  },
});

export const apply = mutation({
  args: {
    slug: v.string(),
    displayName: v.string(),
    legalName: v.string(),
    description: v.string(),
    supportEmail: v.string(),
    supportPhone: v.string(),
    country: v.string(),
    state: v.string(),
    city: v.string(),
    address,
    fulfillmentModes,
    businessRegistrationNumber: v.optional(v.string()),
    taxIdentificationNumber: v.optional(v.string()),
    documents: v.array(
      v.object({
        url: v.string(),
        key: v.string(),
        filename: v.string(),
        contentType: v.string(),
        size: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("vendors")
      .withIndex("by_slug", (query) => query.eq("slug", args.slug))
      .first();

    if (existing && !existing.deletedAt) {
      throw new Error("Vendor slug is already in use.");
    }

    const vendorId = await ctx.db.insert("vendors", {
      ...timestamps(),
      ownerUserId: user._id,
      slug: args.slug,
      displayName: args.displayName,
      legalName: args.legalName,
      description: args.description,
      supportEmail: args.supportEmail,
      supportPhone: args.supportPhone,
      country: args.country,
      state: args.state,
      city: args.city,
      address: args.address,
      fulfillmentModes: args.fulfillmentModes,
      ratingAverage: 0,
      ratingCount: 0,
      status: "pending_verification",
    });

    await ctx.db.insert("vendorVerification", {
      ...timestamps(),
      vendorId,
      submittedByUserId: user._id,
      status: "pending",
      businessRegistrationNumber: args.businessRegistrationNumber,
      taxIdentificationNumber: args.taxIdentificationNumber,
      documents: args.documents,
    });

    if (!user.roles.includes("vendor")) {
      await ctx.db.patch(user._id, {
        roles: [...user.roles, "vendor"],
        updatedAt: now(),
      });
    }

    await writeAuditLog(ctx, {
      actorUserId: user._id,
      action: "vendor.apply",
      entityType: "vendor",
      entityId: vendorId,
      after: { slug: args.slug, displayName: args.displayName },
    });

    return vendorId;
  },
});

export const updateSettings = mutation({
  args: {
    vendorId: v.id("vendors"),
    displayName: v.string(),
    description: v.string(),
    supportEmail: v.string(),
    supportPhone: v.string(),
    fulfillmentModes,
  },
  handler: async (ctx, args) => {
    const { user, vendor } = await requireVendorOwner(ctx, args.vendorId);
    await ctx.db.patch(args.vendorId, {
      displayName: args.displayName,
      description: args.description,
      supportEmail: args.supportEmail,
      supportPhone: args.supportPhone,
      fulfillmentModes: args.fulfillmentModes,
      updatedAt: now(),
    });
    await writeAuditLog(ctx, {
      actorUserId: user._id,
      action: "vendor.update",
      entityType: "vendor",
      entityId: args.vendorId,
      before: vendor,
      after: args,
    });
    return args.vendorId;
  },
});

export const dashboard = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    await requireVendorOwner(ctx, args.vendorId);
    const [products, orders, ads] = await Promise.all([
      ctx.db
        .query("products")
        .withIndex("by_vendor", (query) => query.eq("vendorId", args.vendorId))
        .collect(),
      ctx.db
        .query("orders")
        .withIndex("by_vendor", (query) => query.eq("vendorId", args.vendorId))
        .collect(),
      ctx.db
        .query("vendorAds")
        .withIndex("by_placement_status", (query: any) =>
          query.eq("placement", "search").eq("status", "active"),
        )
        .collect(),
    ]);

    const revenue = orders
      .filter((order) => ["paid", "processing", "shipped", "delivered"].includes(order.status))
      .reduce((sum, order) => sum + order.total.amount, 0);

    return {
      products: products.filter((product) => !product.deletedAt).length,
      orders: orders.filter((order) => !order.deletedAt).length,
      activeAds: ads.filter((ad) => ad.vendorId === args.vendorId && !ad.deletedAt).length,
      revenue,
      conversionRate: orders.length
        ? Number((orders.length / Math.max(products.length, 1)).toFixed(2))
        : 0,
    };
  },
});
