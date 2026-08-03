import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { ConvexError, v } from "convex/values";

import { now, requireRole, requireVendorOwner, timestamps, writeAuditLog } from "./utils";

const money = v.object({ amount: v.number(), currency: v.string() });

const productInput = {
  vendorId: v.id("vendors"),
  categoryId: v.id("categories"),
  title: v.string(),
  slug: v.string(),
  description: v.string(),
  sku: v.string(),
  manufacturer: v.optional(v.string()),
  brand: v.optional(v.string()),
  condition: v.union(v.literal("new"), v.literal("used"), v.literal("refurbished")),
  price: money,
  wholesalePrice: v.optional(money),
  minimumWholesaleQuantity: v.optional(v.number()),
  inventoryQuantity: v.number(),
  oemNumbers: v.array(v.string()),
  aftermarketReferences: v.array(v.string()),
  isNegotiable: v.boolean(),
  isBulkPricingEnabled: v.boolean(),
};

export const create = mutation({
  args: productInput,
  handler: async (ctx, args) => {
    const { user, vendor } = await requireVendorOwner(ctx, args.vendorId);

    if (vendor.status !== "approved") {
      throw new ConvexError("Vendor must be approved before publishing products.");
    }

    const productId = await ctx.db.insert("products", {
      ...timestamps(),
      ...args,
      availability: availabilityForQuantity(args.inventoryQuantity),
      status: "pending_review",
    });

    await writeAuditLog(ctx, {
      actorUserId: user._id,
      action: "product.create",
      entityType: "product",
      entityId: productId,
      after: args,
    });

    return productId;
  },
});

export const update = mutation({
  args: {
    productId: v.id("products"),
    ...productInput,
  },
  handler: async (ctx, args) => {
    const before = await ctx.db.get(args.productId);
    if (!before || before.deletedAt) {
      throw new ConvexError("Product not found.");
    }

    const { user } = await requireVendorOwner(ctx, before.vendorId);
    const { productId, ...patch } = args;

    await ctx.db.patch(productId, {
      ...patch,
      availability: availabilityForQuantity(args.inventoryQuantity),
      status: before.status === "active" ? "pending_review" : before.status,
      updatedAt: now(),
    });

    await writeAuditLog(ctx, {
      actorUserId: user._id,
      action: "product.update",
      entityType: "product",
      entityId: productId,
      before,
      after: patch,
    });

    return productId;
  },
});

export const addImage = mutation({
  args: {
    productId: v.id("products"),
    url: v.string(),
    key: v.string(),
    alt: v.string(),
    sortOrder: v.number(),
    isPrimary: v.boolean(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.deletedAt) {
      throw new ConvexError("Product not found.");
    }

    await requireVendorOwner(ctx, product.vendorId);

    if (args.isPrimary) {
      const images = await ctx.db
        .query("productImages")
        .withIndex("by_product_primary", (query: any) =>
          query.eq("productId", args.productId).eq("isPrimary", true),
        )
        .collect();
      await Promise.all(
        images.map((image) => ctx.db.patch(image._id, { isPrimary: false, updatedAt: now() })),
      );
    }

    return await ctx.db.insert("productImages", { ...timestamps(), ...args });
  },
});

export const setCompatibility = mutation({
  args: {
    productId: v.id("products"),
    rows: v.array(
      v.object({
        makeId: v.id("vehicleMakes"),
        modelId: v.id("vehicleModels"),
        yearId: v.id("vehicleYears"),
        variantId: v.optional(v.id("vehicleVariants")),
        compatibilityType: v.union(v.literal("compatible"), v.literal("incompatible")),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.deletedAt) {
      throw new ConvexError("Product not found.");
    }

    const { user } = await requireVendorOwner(ctx, product.vendorId);
    const existing = await ctx.db
      .query("productCompatibility")
      .withIndex("by_product", (query) => query.eq("productId", args.productId))
      .collect();
    await Promise.all(
      existing.map((row) => ctx.db.patch(row._id, { deletedAt: now(), updatedAt: now() })),
    );
    await Promise.all(
      args.rows.map((row) =>
        ctx.db.insert("productCompatibility", {
          ...timestamps(),
          productId: args.productId,
          ...row,
        }),
      ),
    );

    await ctx.db.patch(args.productId, { updatedAt: now() });
    await writeAuditLog(ctx, {
      actorUserId: user._id,
      action: "product.compatibility.replace",
      entityType: "product",
      entityId: args.productId,
      after: args.rows,
    });

    return args.rows.length;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (query) => query.eq("slug", args.slug))
      .first();

    if (!product || product.deletedAt || product.status !== "active") {
      return null;
    }

    const [vendor, category, images, compatibility] = await Promise.all([
      ctx.db.get(product.vendorId),
      ctx.db.get(product.categoryId),
      ctx.db
        .query("productImages")
        .withIndex("by_product_sort", (query) => query.eq("productId", product._id))
        .collect(),
      ctx.db
        .query("productCompatibility")
        .withIndex("by_product", (query) => query.eq("productId", product._id))
        .collect(),
    ]);

    return {
      product,
      vendor,
      category,
      images: images.filter((image) => !image.deletedAt),
      compatibility: compatibility.filter((row) => !row.deletedAt),
    };
  },
});

export const listByVendor = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    await requireVendorOwner(ctx, args.vendorId);
    return await ctx.db
      .query("products")
      .withIndex("by_vendor", (query) => query.eq("vendorId", args.vendorId))
      .collect()
      .then((rows) => rows.filter((row) => !row.deletedAt));
  },
});

export const moderate = mutation({
  args: {
    productId: v.id("products"),
    status: v.union(v.literal("active"), v.literal("rejected"), v.literal("archived")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["moderator", "admin", "super_admin"]);
    const before = await ctx.db.get(args.productId);

    if (!before) {
      throw new ConvexError("Product not found.");
    }

    await ctx.db.patch(args.productId, {
      status: args.status,
      updatedAt: now(),
    });

    await writeAuditLog(ctx, {
      actorUserId: actor._id,
      action: `product.${args.status}`,
      entityType: "product",
      entityId: args.productId,
      before,
      after: args,
    });

    return args.productId;
  },
});

function availabilityForQuantity(quantity: number) {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= 3) return "low_stock";
  return "in_stock";
}
