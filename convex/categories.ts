import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import { now, requireRole, timestamps, writeAuditLog } from "./utils";

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_active_sort", (query) => query.eq("isActive", true))
      .collect()
      .then((rows) => rows.filter((row) => !row.deletedAt));
  },
});

export const upsert = mutation({
  args: {
    categoryId: v.optional(v.id("categories")),
    parentCategoryId: v.optional(v.id("categories")),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin", "super_admin"]);
    const current = now();

    if (args.categoryId) {
      const before = await ctx.db.get(args.categoryId);
      await ctx.db.patch(args.categoryId, {
        parentCategoryId: args.parentCategoryId,
        name: args.name,
        slug: args.slug,
        description: args.description,
        sortOrder: args.sortOrder,
        isActive: args.isActive,
        updatedAt: current,
      });
      await writeAuditLog(ctx, {
        actorUserId: actor._id,
        action: "category.update",
        entityType: "category",
        entityId: args.categoryId,
        before,
        after: args,
      });
      return args.categoryId;
    }

    const categoryId = await ctx.db.insert("categories", {
      ...timestamps(),
      parentCategoryId: args.parentCategoryId,
      name: args.name,
      slug: args.slug,
      description: args.description,
      sortOrder: args.sortOrder,
      isActive: args.isActive,
    });

    await writeAuditLog(ctx, {
      actorUserId: actor._id,
      action: "category.create",
      entityType: "category",
      entityId: categoryId,
      after: args,
    });

    return categoryId;
  },
});
