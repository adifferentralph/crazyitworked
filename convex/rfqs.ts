import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { ConvexError, v } from "convex/values";

import { now, requireUser, requireVendorOwner, timestamps, writeAuditLog } from "./utils";

const attachment = v.object({
  url: v.string(),
  key: v.string(),
  filename: v.string(),
  contentType: v.string(),
  size: v.number(),
});

const money = v.object({ amount: v.number(), currency: v.string() });

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    quantity: v.number(),
    destinationCity: v.string(),
    destinationCountry: v.string(),
    targetCurrency: v.string(),
    neededBy: v.optional(v.number()),
    attachments: v.array(attachment),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    return await ctx.db.insert("rfqs", {
      ...timestamps(),
      buyerUserId: user._id,
      title: args.title,
      description: args.description,
      quantity: args.quantity,
      destinationCity: args.destinationCity,
      destinationCountry: args.destinationCountry,
      targetCurrency: args.targetCurrency,
      neededBy: args.neededBy,
      attachments: args.attachments,
      status: "open",
    });
  },
});

export const listOpen = query({
  args: { destinationCountry: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const rfqs = await ctx.db
      .query("rfqs")
      .withIndex("by_status", (query) => query.eq("status", "open"))
      .collect();

    return rfqs.filter(
      (rfq) =>
        !rfq.deletedAt &&
        (!args.destinationCountry || rfq.destinationCountry === args.destinationCountry),
    );
  },
});

export const submitQuotation = mutation({
  args: {
    rfqId: v.id("rfqs"),
    vendorId: v.id("vendors"),
    unitPrice: money,
    quantityAvailable: v.number(),
    leadTimeDays: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireVendorOwner(ctx, args.vendorId);
    const rfq = await ctx.db.get(args.rfqId);

    if (!rfq || rfq.deletedAt || !["open", "quoted", "negotiating"].includes(rfq.status)) {
      throw new ConvexError("RFQ is not open for quotations.");
    }

    const quotationId = await ctx.db.insert("quotations", {
      ...timestamps(),
      rfqId: args.rfqId,
      vendorId: args.vendorId,
      submittedByUserId: user._id,
      unitPrice: args.unitPrice,
      quantityAvailable: args.quantityAvailable,
      leadTimeDays: args.leadTimeDays,
      notes: args.notes,
      status: "submitted",
    });

    await ctx.db.patch(args.rfqId, { status: "quoted", updatedAt: now() });
    return quotationId;
  },
});

export const acceptQuotation = mutation({
  args: {
    quotationId: v.id("quotations"),
    fulfillmentMode: v.union(
      v.literal("pickup"),
      v.literal("delivery"),
      v.literal("interstate_shipping"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const quotation = await ctx.db.get(args.quotationId);

    if (!quotation || quotation.deletedAt || quotation.status !== "submitted") {
      throw new ConvexError("Quotation is not available.");
    }

    const rfq = await ctx.db.get(quotation.rfqId);
    if (!rfq || rfq.buyerUserId !== user._id) {
      throw new ConvexError("Only the RFQ buyer can accept this quotation.");
    }

    const subtotalAmount = quotation.unitPrice.amount * rfq.quantity;
    const marketplaceFeeAmount = Math.ceil(subtotalAmount * 0.025);
    const orderNumber = `RFQ-${new Date().getFullYear()}-${now().toString(36).toUpperCase()}`;
    const orderId = await ctx.db.insert("orders", {
      ...timestamps(),
      buyerUserId: user._id,
      vendorId: quotation.vendorId,
      orderNumber,
      status: "pending_payment",
      subtotal: { amount: subtotalAmount, currency: quotation.unitPrice.currency },
      deliveryFee: { amount: 0, currency: quotation.unitPrice.currency },
      marketplaceFee: { amount: marketplaceFeeAmount, currency: quotation.unitPrice.currency },
      total: {
        amount: subtotalAmount + marketplaceFeeAmount,
        currency: quotation.unitPrice.currency,
      },
      fulfillmentMode: args.fulfillmentMode,
      escrowStatus: "held",
    });

    await ctx.db.patch(quotation._id, { status: "accepted", updatedAt: now() });
    await ctx.db.patch(rfq._id, { status: "converted_to_order", updatedAt: now() });
    await writeAuditLog(ctx, {
      actorUserId: user._id,
      action: "rfq.convert_to_order",
      entityType: "rfq",
      entityId: rfq._id,
      after: { quotationId: quotation._id, orderId },
    });

    return { orderId, orderNumber };
  },
});
