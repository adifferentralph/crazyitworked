import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { ConvexError, v } from "convex/values";

import { now, requireUser, timestamps } from "./utils";

const address = v.object({
  line1: v.string(),
  line2: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  country: v.string(),
  postalCode: v.optional(v.string()),
});

export const addToCart = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    selectedFulfillmentMode: v.union(
      v.literal("pickup"),
      v.literal("delivery"),
      v.literal("interstate_shipping"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const product = await ctx.db.get(args.productId);

    if (!product || product.deletedAt || product.status !== "active") {
      throw new ConvexError("Product is not available.");
    }

    if (product.inventoryQuantity < args.quantity) {
      throw new ConvexError("Requested quantity exceeds available inventory.");
    }

    const existing = await ctx.db
      .query("cartItems")
      .withIndex("by_user_product", (query: any) =>
        query.eq("userId", user._id).eq("productId", args.productId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: existing.quantity + args.quantity,
        selectedFulfillmentMode: args.selectedFulfillmentMode,
        updatedAt: now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("cartItems", {
      ...timestamps(),
      userId: user._id,
      productId: args.productId,
      vendorId: product.vendorId,
      quantity: args.quantity,
      selectedFulfillmentMode: args.selectedFulfillmentMode,
    });
  },
});

export const myCart = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .collect();

    return await Promise.all(
      items
        .filter((item) => !item.deletedAt)
        .map(async (item) => ({
          item,
          product: await ctx.db.get(item.productId),
          vendor: await ctx.db.get(item.vendorId),
        })),
    );
  },
});

export const createOrderFromCart = mutation({
  args: {
    vendorId: v.id("vendors"),
    fulfillmentMode: v.union(
      v.literal("pickup"),
      v.literal("delivery"),
      v.literal("interstate_shipping"),
    ),
    shippingAddress: v.optional(address),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .collect()
      .then((items) => items.filter((item) => !item.deletedAt && item.vendorId === args.vendorId));

    if (!cartItems.length) {
      throw new ConvexError("Cart is empty for this vendor.");
    }

    const products = await Promise.all(cartItems.map((item) => ctx.db.get(item.productId)));
    const subtotalAmount = products.reduce((sum, product, index) => {
      if (!product || product.deletedAt || product.inventoryQuantity < cartItems[index].quantity) {
        throw new ConvexError("One or more cart items are no longer available.");
      }

      return sum + product.price.amount * cartItems[index].quantity;
    }, 0);

    const currency = products[0].price.currency;
    const deliveryFeeAmount =
      args.fulfillmentMode === "pickup" ? 0 : Math.ceil(subtotalAmount * 0.035);
    const marketplaceFeeAmount = Math.ceil(subtotalAmount * 0.025);
    const orderNumber = `TM-${new Date().getFullYear()}-${now().toString(36).toUpperCase()}`;
    const orderId = await ctx.db.insert("orders", {
      ...timestamps(),
      buyerUserId: user._id,
      vendorId: args.vendorId,
      orderNumber,
      status: "pending_payment",
      subtotal: { amount: subtotalAmount, currency },
      deliveryFee: { amount: deliveryFeeAmount, currency },
      marketplaceFee: { amount: marketplaceFeeAmount, currency },
      total: {
        amount: subtotalAmount + deliveryFeeAmount + marketplaceFeeAmount,
        currency,
      },
      fulfillmentMode: args.fulfillmentMode,
      shippingAddress: args.shippingAddress,
      escrowStatus: "not_required",
    });

    await Promise.all(
      cartItems.map(async (item, index) => {
        const product = products[index];
        await ctx.db.insert("orderItems", {
          ...timestamps(),
          orderId,
          productId: product._id,
          vendorId: args.vendorId,
          title: product.title,
          sku: product.sku,
          quantity: item.quantity,
          unitPrice: product.price,
          total: {
            amount: product.price.amount * item.quantity,
            currency: product.price.currency,
          },
        });
        await ctx.db.patch(product._id, {
          inventoryQuantity: product.inventoryQuantity - item.quantity,
          updatedAt: now(),
        });
        await ctx.db.delete(item._id);
      }),
    );

    return { orderId, orderNumber };
  },
});

export const myOrders = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("orders")
      .withIndex("by_buyer", (query) => query.eq("buyerUserId", user._id))
      .collect()
      .then((orders) => orders.filter((order) => !order.deletedAt));
  },
});
