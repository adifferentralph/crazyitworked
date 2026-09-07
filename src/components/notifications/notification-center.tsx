import Link from "next/link";
import { BadgeCheck, Bell, Box, CircleUserRound, FileQuestion, ShoppingBag } from "lucide-react";

import { markNotificationReadAction } from "@/app/(protected)/notification-actions";
import { PushNotificationManager } from "@/components/notifications/push-notification-manager";
import { Button } from "@/components/ui/button";
import type { NotificationKind, NotificationListItem } from "@/lib/notifications/push";

const notificationIcons: Record<NotificationKind, typeof Bell> = {
  ACCOUNT: CircleUserRound,
  LISTING: BadgeCheck,
  ORDER: ShoppingBag,
  REQUEST: FileQuestion,
  SYSTEM: Box,
};

export function NotificationCenter({
  notifications,
  publicKey,
}: {
  notifications: NotificationListItem[];
  publicKey: string | null;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-stone-950 text-white">
            <Bell aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-stone-950">Push notifications</h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Opt in on this device for important order, request, and listing updates.
            </p>
          </div>
        </div>
        <PushNotificationManager publicKey={publicKey} />
      </section>

      <section
        aria-labelledby="notification-history"
        className="rounded-xl border border-stone-200 bg-white"
      >
        <div className="border-b border-stone-200 px-5 py-4 sm:px-6">
          <h2 className="font-semibold text-stone-950" id="notification-history">
            Recent updates
          </h2>
        </div>
        {notifications.length ? (
          <ul className="divide-y divide-stone-200">
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.kind];

              return (
                <li
                  className={`flex items-start gap-3 px-5 py-5 sm:px-6 ${
                    notification.readAt ? "bg-white" : "bg-orange-50/60"
                  }`}
                  key={notification.id}
                >
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-700">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        className="font-semibold text-stone-950 underline-offset-4 hover:underline"
                        href={notification.destination}
                      >
                        {notification.title}
                      </Link>
                      <time
                        className="text-xs text-stone-500"
                        dateTime={notification.createdAt.toISOString()}
                      >
                        {new Intl.DateTimeFormat("en-NG", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Africa/Lagos",
                        }).format(notification.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{notification.body}</p>
                    {!notification.readAt ? (
                      <form action={markNotificationReadAction} className="mt-3">
                        <input name="notificationId" type="hidden" value={notification.id} />
                        <Button size="sm" type="submit" variant="outline">
                          Mark as read
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-5 py-12 text-center sm:px-6">
            <Bell aria-hidden="true" className="mx-auto size-9 text-stone-300" />
            <h3 className="mt-4 text-lg font-semibold text-stone-950">You are all caught up</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Important account and marketplace updates will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
