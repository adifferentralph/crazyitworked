"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Download } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  sendTestPushAction,
  subscribeToPushAction,
  unsubscribeFromPushAction,
} from "@/app/(protected)/notification-actions";
import { Button } from "@/components/ui/button";

type SupportState = "checking" | "ios-install-required" | "supported" | "unsupported";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function getDeviceLabel() {
  const userAgentData = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData;
  const platform = userAgentData?.platform || navigator.platform || "This device";
  return `${platform} browser`.slice(0, 80);
}

export function PushNotificationManager({ publicKey }: { publicKey: string | null }) {
  const router = useRouter();
  const [support, setSupport] = useState<SupportState>("checking");
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"error" | "success" | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    async function inspectSupport() {
      if (
        !publicKey ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (active) setSupport("unsupported");
        return;
      }

      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIos && !isStandalone()) {
        if (active) setSupport("ios-install-required");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const subscription = await registration.pushManager.getSubscription();
        if (active) {
          setEnabled(Boolean(subscription));
          setSupport("supported");
        }
      } catch {
        if (active) setSupport("unsupported");
      }
    }

    void inspectSupport();
    return () => {
      active = false;
    };
  }, [publicKey]);

  async function enableNotifications() {
    if (!publicKey) return;
    setMessage(null);

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("error");
      setMessage(
        permission === "denied"
          ? "Notifications are blocked in your browser settings."
          : "Notification permission was not granted.",
      );
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const current = await registration.pushManager.getSubscription();
      const subscription =
        current ??
        (await registration.pushManager.subscribe({
          applicationServerKey: urlBase64ToUint8Array(publicKey),
          userVisibleOnly: true,
        }));
      const serialized = subscription.toJSON();
      const result = await subscribeToPushAction({
        deviceLabel: getDeviceLabel(),
        subscription: serialized,
        userAgent: navigator.userAgent.slice(0, 500),
      });
      setStatus(result.status);
      setMessage(result.message);
      setEnabled(result.status === "success");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("This device could not be subscribed. Check browser notification settings.");
    }
  }

  async function disableNotifications() {
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const result = await unsubscribeFromPushAction(subscription.endpoint);
        await subscription.unsubscribe();
        setStatus(result.status);
        setMessage(result.message);
      } else {
        setStatus("success");
        setMessage("Push notifications are already disabled on this device.");
      }
      setEnabled(false);
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("This device could not be unsubscribed. Please try again.");
    }
  }

  function sendTest() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await sendTestPushAction();
        setStatus(result.status);
        setMessage(result.message);
        router.refresh();
      } catch {
        setStatus("error");
        setMessage("The test notification could not be sent.");
      }
    });
  }

  function showInstallHelp() {
    window.dispatchEvent(new CustomEvent("ttp:show-install-prompt"));
  }

  if (support === "checking") {
    return <p className="text-sm text-stone-600">Checking notification support&</p>;
  }

  if (support === "ios-install-required") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm leading-6 text-stone-600">
          On iPhone and iPad, install Twenty-Two Parts on your Home Screen before enabling push
          notifications.
        </p>
        <Button onClick={showInstallHelp} type="button" variant="outline">
          <Download aria-hidden="true" className="size-4" />
          Show install instructions
        </Button>
      </div>
    );
  }

  if (support === "unsupported") {
    return (
      <p className="text-sm leading-6 text-stone-600">
        Push notifications are unavailable in this browser. You will still receive updates in this
        notification centre.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {enabled ? (
          <>
            <Button disabled={isPending} onClick={sendTest} type="button">
              <Bell aria-hidden="true" className="size-4" />
              {isPending ? "Sending&" : "Send test notification"}
            </Button>
            <Button
              disabled={isPending}
              onClick={disableNotifications}
              type="button"
              variant="outline"
            >
              <BellOff aria-hidden="true" className="size-4" />
              Disable on this device
            </Button>
          </>
        ) : (
          <Button disabled={isPending} onClick={enableNotifications} type="button">
            <Bell aria-hidden="true" className="size-4" />
            Enable on this device
          </Button>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">
        Permission is requested only after you choose Enable. You can turn it off here or in your
        browser settings at any time.
      </p>
      {message ? (
        <p
          aria-live="polite"
          className={`mt-3 text-sm ${status === "error" ? "text-red-700" : "text-emerald-700"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
