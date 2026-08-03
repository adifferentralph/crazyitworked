import { ConvexError } from "convex/values";

export type AuthenticatedUser = {
  _id: any;
  clerkUserId: string;
  email: string;
  name: string;
  roles: string[];
  status: string;
};

export function now() {
  return Date.now();
}

export function timestamps() {
  const current = now();
  return { createdAt: current, updatedAt: current };
}

export async function requireUser(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
  db: any;
}) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError("Authentication is required.");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (query: any) => query.eq("clerkUserId", identity.subject))
    .first();

  if (!user || user.deletedAt || user.status !== "active") {
    throw new ConvexError("Active marketplace user account is required.");
  }

  return user as AuthenticatedUser;
}

export async function requireRole(
  ctx: {
    auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
    db: any;
  },
  roles: string[],
) {
  const user = await requireUser(ctx);

  if (!user.roles.some((role) => roles.includes(role))) {
    throw new ConvexError("Insufficient permissions.");
  }

  return user;
}

export async function requireVendorOwner(ctx: any, vendorId: string) {
  const user = await requireUser(ctx);
  const vendor = await ctx.db.get(vendorId);

  if (!vendor || vendor.deletedAt) {
    throw new ConvexError("Vendor not found.");
  }

  const isOwner = vendor.ownerUserId === user._id;
  const isAdmin = user.roles.some((role: string) => ["admin", "super_admin"].includes(role));

  if (!isOwner && !isAdmin) {
    throw new ConvexError("Vendor ownership is required.");
  }

  return { user, vendor };
}

export async function writeAuditLog(
  ctx: any,
  input: {
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
    ipAddress?: string;
    userAgent?: string;
  },
) {
  await ctx.db.insert("auditLogs", {
    ...timestamps(),
    ...input,
  });
}

export async function enforceRateLimit(ctx: any, key: string, limit: number, windowMs: number) {
  const current = now();
  const existing = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (query: any) => query.eq("key", key))
    .first();

  if (!existing || existing.expiresAt <= current) {
    await ctx.db.insert("rateLimits", {
      ...timestamps(),
      key,
      windowStart: current,
      count: 1,
      expiresAt: current + windowMs,
    });
    return;
  }

  if (existing.count >= limit) {
    throw new ConvexError("Rate limit exceeded.");
  }

  await ctx.db.patch(existing._id, {
    count: existing.count + 1,
    updatedAt: current,
  });
}
