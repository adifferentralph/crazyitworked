"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/principal";
import {
  markUserNotificationRead,
  publishTestNotification,
  removePushSubscription,
  savePushSubscription,
} from "@/lib/notifications/push";

type PushActionResult = {
  message: string;
  status: "error" | "success";
};

const clientSubscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(2_000),
  expirationTime: z.number().int().positive().nullable(),
  keys: z.object({
    auth: z.string().min(8).max(500),
    p256dh: z.string().min(20).max(500),
  }),
});

function notificationPath(role: string) {
  return role === "SELLER" ? "/seller/notifications" : "/account/notifications";
}

export async function subscribeToPushAction(input: {
  deviceLabel: string;
  subscription: unknown;
  userAgent: string | null;
}): Promise<PushActionResult> {
  const principal = await requireRole(["BUYER", "SELLER"], "/account/notifications");
  const parsed = clientSubscriptionSchema.safeParse(input.subscription);

  if (!parsed.success) {
    return { message: "This browser returned an invalid push subscription.", status: "error" };
  }

  try {
    await savePushSubscription(principal.id, {
      auth: parsed.data.keys.auth,
      deviceLabel: input.deviceLabel,
      endpoint: parsed.data.endpoint,
      expirationTime: parsed.data.expirationTime,
      p256dh: parsed.data.keys.p256dh,
      userAgent: input.userAgent,
    });
    revalidatePath(notificationPath(principal.role));
    return { message: "Push notifications are enabled on this device.", status: "success" };
  } catch (error) {
    return {
      message:
        error instanceof Error && error.message.includes("another signed-in account")
          ? "Disable this browser subscription, then enable it again for this account."
          : "Push notifications could not be enabled. Please try again.",
      status: "error",
    };
  }
}

export async function unsubscribeFromPushAction(endpoint: string): Promise<PushActionResult> {
  const principal = await requireRole(["BUYER", "SELLER"], "/account/notifications");

  try {
    await removePushSubscription(principal.id, endpoint);
    revalidatePath(notificationPath(principal.role));
    return { message: "Push notifications are disabled on this device.", status: "success" };
  } catch {
    return { message: "We could not update this device. Please try again.", status: "error" };
  }
}

export async function sendTestPushAction(): Promise<PushActionResult> {
  const principal = await requireRole(["BUYER", "SELLER"], "/account/notifications");

  await publishTestNotification(
    principal.id,
    principal.role === "SELLER" ? "/seller/notifications" : "/account/notifications",
  );
  revalidatePath(notificationPath(principal.role));
  return {
    message: "Test notification sent. For safety, this can be sent once per minute.",
    status: "success",
  };
}

export async function markNotificationReadAction(formData: FormData) {
  const principal = await requireRole(["BUYER", "SELLER"], "/account/notifications");
  const parsed = z.string().uuid().safeParse(formData.get("notificationId"));
  if (!parsed.success) return;

  await markUserNotificationRead(principal.id, parsed.data);
  revalidatePath(notificationPath(principal.role));
}
