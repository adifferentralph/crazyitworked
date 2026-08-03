import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import { now, requireUser, timestamps } from "./utils";

export const syncFromClerk = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", args.clerkUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        status: existing.status === "deleted" ? "deleted" : "active",
        updatedAt: now(),
        lastSeenAt: now(),
      });
      return existing._id;
    }

    const userId = await ctx.db.insert("users", {
      ...timestamps(),
      clerkUserId: args.clerkUserId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      roles: ["buyer"],
      status: "active",
      lastSeenAt: now(),
    });

    await ctx.db.insert("profiles", {
      ...timestamps(),
      userId,
      country: "Nigeria",
    });

    return userId;
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .first();

    return { user, profile };
  },
});

export const updateProfile = mutation({
  args: {
    phone: v.optional(v.string()),
    country: v.string(),
    state: v.optional(v.string()),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (query) => query.eq("userId", user._id))
      .first();

    if (!profile) {
      return await ctx.db.insert("profiles", { ...timestamps(), userId: user._id, ...args });
    }

    await ctx.db.patch(profile._id, { ...args, updatedAt: now() });
    return profile._id;
  },
});

export const saveVehicle = mutation({
  args: {
    year: v.number(),
    make: v.string(),
    model: v.string(),
    variant: v.optional(v.string()),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    return await ctx.db.insert("savedVehicles", {
      ...timestamps(),
      userId: user._id,
      ...args,
    });
  },
});
