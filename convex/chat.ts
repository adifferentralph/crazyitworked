import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { ConvexError, v } from "convex/values";

import { now, requireUser, timestamps } from "./utils";

const attachment = v.object({
  url: v.string(),
  key: v.string(),
  filename: v.string(),
  contentType: v.string(),
  size: v.number(),
});

export const startProductConversation = mutation({
  args: {
    productId: v.id("products"),
    openingMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const product = await ctx.db.get(args.productId);

    if (!product || product.deletedAt || product.status !== "active") {
      throw new ConvexError("Product is not available for chat.");
    }

    const image = await ctx.db
      .query("productImages")
      .withIndex("by_product_primary", (query: any) =>
        query.eq("productId", product._id).eq("isPrimary", true),
      )
      .first();

    const conversationId = await ctx.db.insert("conversations", {
      ...timestamps(),
      buyerUserId: user._id,
      vendorId: product.vendorId,
      productId: product._id,
      subject: product.title,
      productSnapshot: {
        imageUrl: image?.url,
        sku: product.sku,
        title: product.title,
        price: product.price,
        vendorId: product.vendorId,
      },
      lastMessageAt: now(),
      status: "open",
    });

    await ctx.db.insert("messages", {
      ...timestamps(),
      conversationId,
      senderUserId: user._id,
      body: args.openingMessage ?? `I am interested in ${product.title} (${product.sku}).`,
      messageType: "text",
      attachments: [],
    });

    return conversationId;
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
    attachments: v.array(attachment),
    negotiation: v.optional(
      v.object({
        offeredUnitPrice: v.object({ amount: v.number(), currency: v.string() }),
        quantity: v.number(),
        status: v.union(v.literal("proposed"), v.literal("accepted"), v.literal("rejected")),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation || conversation.deletedAt || conversation.status !== "open") {
      throw new ConvexError("Conversation is not open.");
    }

    const isParticipant =
      conversation.buyerUserId === user._id ||
      (await ctx.db.get(conversation.vendorId))?.ownerUserId === user._id;

    if (!isParticipant) {
      throw new ConvexError("Conversation participant access is required.");
    }

    const messageId = await ctx.db.insert("messages", {
      ...timestamps(),
      conversationId: args.conversationId,
      senderUserId: user._id,
      body: args.body,
      messageType: args.attachments.length ? "attachment" : "text",
      attachments: args.attachments,
      negotiation: args.negotiation,
    });

    await ctx.db.patch(args.conversationId, { lastMessageAt: now(), updatedAt: now() });
    return messageId;
  },
});

export const listMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);

    if (!conversation) {
      throw new ConvexError("Conversation not found.");
    }

    const vendor = await ctx.db.get(conversation.vendorId);
    if (conversation.buyerUserId !== user._id && vendor?.ownerUserId !== user._id) {
      throw new ConvexError("Conversation participant access is required.");
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (query) => query.eq("conversationId", args.conversationId))
      .collect()
      .then((rows) => rows.filter((row) => !row.deletedAt));
  },
});

export const markConversationRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (query) => query.eq("conversationId", args.conversationId))
      .collect();

    await Promise.all(
      messages
        .filter((message) => message.senderUserId !== user._id)
        .map(async (message) => {
          const receipt = await ctx.db
            .query("messageReceipts")
            .withIndex("by_message_user", (query: any) =>
              query.eq("messageId", message._id).eq("userId", user._id),
            )
            .first();

          if (receipt) {
            await ctx.db.patch(receipt._id, { readAt: now(), updatedAt: now() });
          } else {
            await ctx.db.insert("messageReceipts", {
              ...timestamps(),
              messageId: message._id,
              conversationId: args.conversationId,
              userId: user._id,
              readAt: now(),
            });
          }
        }),
    );
  },
});

export const setTyping = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_user_conversation", (query: any) =>
        query.eq("userId", user._id).eq("conversationId", args.conversationId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { expiresAt: now() + 5000, updatedAt: now() });
      return existing._id;
    }

    return await ctx.db.insert("typingIndicators", {
      ...timestamps(),
      conversationId: args.conversationId,
      userId: user._id,
      expiresAt: now() + 5000,
    });
  },
});
