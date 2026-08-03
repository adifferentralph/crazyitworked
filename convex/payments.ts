import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { ConvexError, v } from "convex/values";

import { now, requireRole, timestamps, writeAuditLog } from "./utils";

export const recordStripeCheckoutCompleted = mutation({
  args: {
    eventId: v.string(),
    checkoutSessionId: v.string(),
    orderNumber: v.string(),
    amountTotal: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (query) => query.eq("orderNumber", args.orderNumber))
      .first();

    if (!order) {
      throw new ConvexError("Order not found for checkout session.");
    }

    const existing = await ctx.db
      .query("payments")
      .withIndex("by_provider_reference", (query: any) =>
        query.eq("provider", "stripe").eq("providerReference", args.checkoutSessionId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "succeeded",
        rawEventIds: existing.rawEventIds.includes(args.eventId)
          ? existing.rawEventIds
          : [...existing.rawEventIds, args.eventId],
        paidAt: now(),
        updatedAt: now(),
      });
    } else {
      await ctx.db.insert("payments", {
        ...timestamps(),
        orderId: order._id,
        provider: "stripe",
        providerReference: args.checkoutSessionId,
        amount: {
          amount: args.amountTotal,
          currency: args.currency.toUpperCase(),
        },
        status: "succeeded",
        rawEventIds: [args.eventId],
        paidAt: now(),
      });
    }

    await ctx.db.patch(order._id, { status: "paid", escrowStatus: "held", updatedAt: now() });
    return order._id;
  },
});

export const listByOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["support_agent", "admin", "super_admin"]);
    return await ctx.db
      .query("payments")
      .withIndex("by_order", (query) => query.eq("orderId", args.orderId))
      .collect()
      .then((rows) => rows.filter((row) => !row.deletedAt));
  },
});

export const refundRecorded = mutation({
  args: {
    paymentId: v.id("payments"),
    providerEventId: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin", "super_admin", "support_agent"]);
    const before = await ctx.db.get(args.paymentId);

    if (!before) {
      throw new ConvexError("Payment not found.");
    }

    await ctx.db.patch(args.paymentId, {
      status: "refunded",
      rawEventIds: before.rawEventIds.includes(args.providerEventId)
        ? before.rawEventIds
        : [...before.rawEventIds, args.providerEventId],
      updatedAt: now(),
    });

    await ctx.db.patch(before.orderId, {
      status: "refunded",
      escrowStatus: "refunded",
      updatedAt: now(),
    });

    await writeAuditLog(ctx, {
      actorUserId: actor._id,
      action: "payment.refund_recorded",
      entityType: "payment",
      entityId: args.paymentId,
      before,
      after: args,
    });
  },
});
