/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

interface BadgingNavigator extends Navigator {
  setAppBadge(contents?: number): Promise<void>;
  clearAppBadge(): Promise<void>;
}

self.addEventListener("push", (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options: NotificationOptions = {
        body: data.body,
        icon: data.icon || "/icons/icon-192x192.png",
        badge: data.badge || "/icons/icon-192x192.png",
        data: data.data,
      };

      // Handle App Badge API
      if ("setAppBadge" in navigator) {
        // If the push data contains an unreadCount, use it, otherwise show a generic badge
        const badgeCount =
          data.unreadCount !== undefined ? (data.unreadCount as number) : undefined;
        (navigator as BadgingNavigator).setAppBadge(badgeCount).catch((err: unknown) => {
          console.error("Failed to set app badge:", err);
        });
      }

      event.waitUntil(self.registration.showNotification(data.title, options));
    } catch (error) {
      console.error("Error parsing push data:", error);

      // Handle App Badge API for fallback
      if ("setAppBadge" in navigator) {
        (navigator as BadgingNavigator).setAppBadge().catch((err: unknown) => {
          console.error("Failed to set app badge (fallback):", err);
        });
      }

      event.waitUntil(
        self.registration.showNotification("Pretoria Prepaid", {
          body: "You have a new electricity alert.",
          icon: "/icons/icon-192x192.png",
        })
      );
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Clear App Badge API
  if ("clearAppBadge" in navigator) {
    (navigator as BadgingNavigator).clearAppBadge().catch((err: unknown) => {
      console.error("Failed to clear app badge:", err);
    });
  }

  const urlToOpen = new URL(event.notification.data?.url || "/dashboard", self.location.origin)
    .href;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Look for any window/PWA client that is on our origin
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          // Focus the existing app window
          await client.focus();
          // Navigate it to the specific notification URL if it's not already there
          if (client.url !== urlToOpen && "navigate" in client) {
            await client.navigate(urlToOpen);
          }
          return;
        }
      }

      // If no window is open, open a new one
      if (self.clients.openWindow) {
        await self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

interface PushSubscriptionChangeEvent extends ExtendableEvent {
  readonly newSubscription?: PushSubscription;
  readonly oldSubscription?: PushSubscription;
}

// Handle subscription change/rotation
self.addEventListener("pushsubscriptionchange", (event: Event) => {
  const pscEvent = event as PushSubscriptionChangeEvent;
  pscEvent.waitUntil(
    (async () => {
      let newSubscription = pscEvent.newSubscription;

      // If the browser provides the new subscription directly, we are good
      // If not, we try to re-subscribe manually using the old subscription's key
      if (!newSubscription && pscEvent.oldSubscription) {
        try {
          newSubscription = await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: pscEvent.oldSubscription.options.applicationServerKey,
          });
        } catch (error) {
          console.error("Failed to re-subscribe after pushsubscriptionchange:", error);
        }
      }

      if (newSubscription) {
        // Since we are in a Service Worker and Convex doesn't have a direct HTTP endpoint
        // for background sync here, we'll rely on our frontend's useProfile sync
        // when the user next opens the app.
        // We log it here for debugging/visibility in DevTools.
        console.log("Push subscription rotated successfully:", newSubscription);
      }
    })()
  );
});
