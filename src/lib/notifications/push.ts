import "server-only";

import { createHash } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import webpush from "web-push";
import { z } from "zod";

import { getPushServerEnvironment, hasPushEnvironment } from "@/config/env";
import { getDatabase } from "@/db/client";
import { notifications, orderItems, orders, pushSubscriptions } from "@/db/schema";

const subscriptionSchema = z.object({
  auth: z.string().min(8).max(500),
  deviceLabel: z.string().trim().min(1).max(80),
  endpoint: z.string().url().startsWith("https://").max(2_000),
  expirationTime: z.number().int().positive().nullable(),
  p256dh: z.string().min(20).max(500),
  userAgent: z.string().trim().max(500).nullable(),
});

const destinationSchema = z
  .string()
  .min(1)
  .max(500)
  .regex(/^\/[A-Za-z0-9_?&=%+./#-]*$/);

export type NotificationKind = "ACCOUNT" | "LISTING" | "ORDER" | "REQUEST" | "SYSTEM";

export type NotificationListItem = {
  body: string;
  createdAt: Date;
  destination: string;
  id: string;
  kind: NotificationKind;
  readAt: Date | null;
  title: string;
};

type NotificationInput = {
  body: string;
  dedupeKey: string;
  destination: string;
  kind: NotificationKind;
  metadata?: Record<string, unknown>;
  title: string;
  userId: string;
};

type SubscriptionInput = z.infer<typeof subscriptionSchema>;

function endpointHash(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}

function isExpiredSubscriptionError(error: unknown) {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return false;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

function configureWebPush() {
  const environment = getPushServerEnvironment();
  webpush.setVapidDetails(
    environment.VAPID_SUBJECT,
    environment.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    environment.VAPID_PRIVATE_KEY,
  );
}

async function deliverPush(userId: string, notification: NotificationListItem) {
  if (!hasPushEnvironment()) return;

  const database = getDatabase();
  const subscriptions = await database
    .select({
      auth: pushSubscriptions.auth,
      endpoint: pushSubscriptions.endpoint,
      id: pushSubscriptions.id,
      p256dh: pushSubscriptions.p256dh,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .orderBy(desc(pushSubscriptions.lastSeenAt))
    .limit(20);

  if (!subscriptions.length) return;

  configureWebPush();
  const payload = JSON.stringify({
    body: notification.body,
    icon: "/icons/app-icon-192.png",
    badge: "/icons/notification-badge-96.png",
    tag: `ttp-${notification.id}`,
    title: notification.title,
    url: notification.destination,
  });

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.auth,
              p256dh: subscription.p256dh,
            },
          },
          payload,
          {
            TTL: 60 * 60,
            timeout: 5_000,
            urgency: "high",
          },
        );

        await database
          .update(pushSubscriptions)
          .set({
            failureCount: 0,
            lastFailureAt: null,
            lastSuccessAt: new Date(),
          })
          .where(eq(pushSubscriptions.id, subscription.id));
      } catch (error) {
        if (isExpiredSubscriptionError(error)) {
          await database.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
          return;
        }

        await database
          .update(pushSubscriptions)
          .set({
            failureCount: sql`${pushSubscriptions.failureCount} + 1`,
            lastFailureAt: new Date(),
          })
          .where(eq(pushSubscriptions.id, subscription.id));
      }
    }),
  );
}

export async function savePushSubscription(userId: string, input: SubscriptionInput) {
  const value = subscriptionSchema.parse(input);
  const database = getDatabase();
  const hash = endpointHash(value.endpoint);
  const [existing] = await database
    .select({ id: pushSubscriptions.id, userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpointHash, hash))
    .limit(1);

  if (existing && existing.userId !== userId) {
    throw new Error("This browser subscription belongs to another signed-in account.");
  }

  const expirationTime = value.expirationTime ? new Date(value.expirationTime) : null;
  if (existing) {
    await database
      .update(pushSubscriptions)
      .set({
        auth: value.auth,
        deviceLabel: value.deviceLabel,
        expirationTime,
        lastSeenAt: new Date(),
        p256dh: value.p256dh,
        userAgent: value.userAgent,
      })
      .where(and(eq(pushSubscriptions.id, existing.id), eq(pushSubscriptions.userId, userId)));
    return;
  }

  await database
    .insert(pushSubscriptions)
    .values({
      auth: value.auth,
      deviceLabel: value.deviceLabel,
      endpoint: value.endpoint,
      endpointHash: hash,
      expirationTime,
      p256dh: value.p256dh,
      userAgent: value.userAgent,
      userId,
    })
    .onConflictDoNothing({ target: pushSubscriptions.endpointHash });

  const [owner] = await database
    .select({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpointHash, hash))
    .limit(1);

  if (!owner || owner.userId !== userId) {
    throw new Error("This browser subscription could not be assigned to the account.");
  }
}

export async function removePushSubscription(userId: string, endpoint: string) {
  const parsedEndpoint = z.string().url().startsWith("https://").max(2_000).parse(endpoint);
  await getDatabase()
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpointHash, endpointHash(parsedEndpoint)),
      ),
    );
}

export async function listUserNotifications(
  userId: string,
  limit = 30,
): Promise<NotificationListItem[]> {
  return getDatabase()
    .select({
      body: notifications.body,
      createdAt: notifications.createdAt,
      destination: notifications.destination,
      id: notifications.id,
      kind: notifications.kind,
      readAt: notifications.readAt,
      title: notifications.title,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(Math.max(1, Math.min(limit, 50)));
}

export async function markUserNotificationRead(userId: string, notificationId: string) {
  const id = z.string().uuid().parse(notificationId);
  await getDatabase()
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function publishNotification(input: NotificationInput) {
  const destination = destinationSchema.parse(input.destination);
  const [created] = await getDatabase()
    .insert(notifications)
    .values({
      body: input.body,
      dedupeKey: input.dedupeKey,
      destination,
      kind: input.kind,
      metadata: input.metadata ?? {},
      title: input.title,
      userId: input.userId,
    })
    .onConflictDoNothing({ target: notifications.dedupeKey })
    .returning({
      body: notifications.body,
      createdAt: notifications.createdAt,
      destination: notifications.destination,
      id: notifications.id,
      kind: notifications.kind,
      readAt: notifications.readAt,
      title: notifications.title,
    });

  if (created) {
    await deliverPush(input.userId, created);
  }

  return created ?? null;
}

export async function publishTestNotification(
  userId: string,
  destination: "/account/notifications" | "/seller/notifications",
) {
  const minuteWindow = Math.floor(Date.now() / 60_000);
  return publishNotification({
    body: "Push notifications are connected to this device.",
    dedupeKey: `push-test:${userId}:${minuteWindow}`,
    destination,
    kind: "SYSTEM",
    title: "Twenty-Two Parts notifications enabled",
    userId,
  });
}

export async function notifyOrderPaid(orderId: string) {
  const database = getDatabase();
  const [order] = await database
    .select({
      buyerId: orders.buyerId,
      orderNumber: orders.orderNumber,
    })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.paymentStatus, "PAID")))
    .limit(1);

  if (!order) return;

  const sellerRows = await database
    .select({ sellerId: orderItems.sellerId })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const sellerIds = [...new Set(sellerRows.map((row) => row.sellerId))];

  await Promise.allSettled([
    publishNotification({
      body: `Payment for order ${order.orderNumber} was confirmed. The order is now being prepared.`,
      dedupeKey: `order-paid:buyer:${orderId}`,
      destination: "/account/orders",
      kind: "ORDER",
      metadata: { orderId },
      title: "Payment confirmed",
      userId: order.buyerId,
    }),
    ...sellerIds.map((sellerId) =>
      publishNotification({
        body: `A paid order includes one or more of your products. Open orders to prepare it.`,
        dedupeKey: `order-paid:seller:${sellerId}:${orderId}`,
        destination: "/seller/orders",
        kind: "ORDER",
        metadata: { orderId },
        title: "New paid order",
        userId: sellerId,
      }),
    ),
  ]);
}
