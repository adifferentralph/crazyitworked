import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import { now, requireUser, timestamps } from "./utils";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .take(50)
      .then((rows) => rows.filter((row) => !row.deletedAt));
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const notification = await ctx.db.get(args.notificationId);

    if (!notification || notification.userId !== user._id) {
      throw new Error("Notification not found.");
    }

    await ctx.db.patch(args.notificationId, { readAt: now(), updatedAt: now() });
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal("order"),
      v.literal("message"),
      v.literal("rfq"),
      v.literal("ad"),
      v.literal("system"),
    ),
    href: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...timestamps(),
      ...args,
    });
  },
});
