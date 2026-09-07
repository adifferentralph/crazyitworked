/* Twenty-Two Parts service worker: push delivery only; no asset interception. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function internalUrl(value) {
  try {
    const target = new URL(typeof value === "string" ? value : "/", self.location.origin);
    return target.origin === self.location.origin ? target.href : self.location.origin + "/";
  } catch {
    return self.location.origin + "/";
  }
}

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let message;
  try {
    message = event.data.json();
  } catch {
    return;
  }

  if (!message || typeof message.title !== "string" || typeof message.body !== "string") {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(message.title, {
      badge: "/icons/notification-badge-96.png",
      body: message.body,
      data: { url: internalUrl(message.url) },
      icon: "/icons/app-icon-192.png",
      tag: typeof message.tag === "string" ? message.tag : undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = internalUrl(event.notification.data && event.notification.data.url);

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then(async (windows) => {
      for (const client of windows) {
        if ("navigate" in client) await client.navigate(destination);
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(destination) : undefined;
    }),
  );
});
