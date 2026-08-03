import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { ConvexError, v } from "convex/values";

import { now, requireRole, writeAuditLog } from "./utils";

export const reviewVendorVerification = mutation({
  args: {
    verificationId: v.id("vendorVerification"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin", "super_admin", "moderator"]);
    const verification = await ctx.db.get(args.verificationId);

    if (!verification) {
      throw new ConvexError("Verification request not found.");
    }

    await ctx.db.patch(args.verificationId, {
      status: args.status,
      rejectionReason: args.rejectionReason,
      reviewedByUserId: actor._id,
      reviewedAt: now(),
      updatedAt: now(),
    });

    await ctx.db.patch(verification.vendorId, {
      status: args.status === "approved" ? "approved" : "rejected",
      updatedAt: now(),
    });

    await writeAuditLog(ctx, {
      actorUserId: actor._id,
      action: `vendor_verification.${args.status}`,
      entityType: "vendorVerification",
      entityId: args.verificationId,
      before: verification,
      after: args,
    });
  },
});

export const suspendUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ["admin", "super_admin"]);
    const before = await ctx.db.get(args.userId);

    if (!before) {
      throw new ConvexError("User not found.");
    }

    await ctx.db.patch(args.userId, { status: "suspended", updatedAt: now() });
    await writeAuditLog(ctx, {
      actorUserId: actor._id,
      action: "user.suspend",
      entityType: "user",
      entityId: args.userId,
      before,
      after: { reason: args.reason },
    });
  },
});

export const auditLogs = query({
  args: {
    entityType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "super_admin", "moderator", "support_agent"]);
    const rows = args.entityType
      ? await ctx.db
          .query("auditLogs")
          .withIndex("by_entity", (query) => query.eq("entityType", args.entityType))
          .take(args.limit ?? 100)
      : await ctx.db.query("auditLogs").take(args.limit ?? 100);

    return rows.filter((row) => !row.deletedAt);
  },
});
