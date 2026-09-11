import { BASE64_CHUNK_SIZE } from "./constants";

/**
 * Converts a base64 string to a Uint8Array.
 * Required for the browser's PushManager.subscribe() method.
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat(
    (BASE64_CHUNK_SIZE - (base64String.length % BASE64_CHUNK_SIZE)) % BASE64_CHUNK_SIZE
  );
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if push notifications are supported in the current browser.
 */
export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Returns the browser's current notification permission state.
 * Falls back to "default" in SSR or unsupported environments.
 */
export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "default";
  }
  return Notification.permission;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Actionable message shown when notifications are blocked at the browser
 * level. Exported so callers and tests can reference it without string
 * matching.
 */
export const NOTIFICATION_PERMISSION_BLOCKED_MESSAGE =
  "Notifications are blocked in your browser settings. To enable them, open site settings via the padlock or site info icon in your browser's address bar, allow notifications for this site, then try again.";

/**
 * Thrown when notifications were already blocked at the browser level
 * (`Notification.permission` is "denied") before a prompt could be shown.
 * Re-prompting is impossible; the user must re-enable notifications via the
 * browser's site settings for this site.
 */
export class NotificationPermissionBlockedError extends Error {
  constructor(message = NOTIFICATION_PERMISSION_BLOCKED_MESSAGE) {
    super(message);
    this.name = "NotificationPermissionBlockedError";
  }
}

/**
 * Requests permission for notifications and subscribes the user to push.
 * @returns The subscription object.
 * @throws Error if failed or denied.
 * @throws NotificationPermissionBlockedError if notifications are already blocked in browser settings.
 */
export async function subscribeUserToPush(): Promise<PushSubscriptionJSON> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  try {
    // Once Notification.permission is "denied", calling requestPermission()
    // resolves "denied" immediately without showing the native dialog again,
    // so detect the pre-existing block before prompting.
    if (getNotificationPermissionState() === "denied") {
      throw new NotificationPermissionBlockedError();
    }

    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission was denied.");
    }

    // 2. Get the service worker registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // 4. Subscribe the user
      const publicKey = import.meta.env["VITE_VAPID_PUBLIC_KEY"] as string | undefined;
      if (!publicKey) {
        throw new Error(
          "VITE_VAPID_PUBLIC_KEY is missing in environment variables. Please check your configuration."
        );
      }

      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    return JSON.parse(JSON.stringify(subscription)) as PushSubscriptionJSON;
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    // Rethrow to allow caller to handle/display the error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while subscribing to push notifications.");
  }
}

/**
 * Unsubscribes the user from push notifications.
 */
export async function unsubscribeUserFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return await subscription.unsubscribe();
    }
    return true;
  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error);
    return false;
  }
}

interface BadgingNavigator extends Navigator {
  setAppBadge(contents?: number): Promise<void>;
  clearAppBadge(): Promise<void>;
}

/**
 * Clears the application badge on the PWA home screen icon.
 * This is safely called and will only execute if the Badging API is supported.
 */
export async function clearBadge(): Promise<void> {
  if ("clearAppBadge" in navigator) {
    try {
      await (navigator as BadgingNavigator).clearAppBadge();
    } catch (error) {
      console.error("Failed to clear app badge:", error);
    }
  }
}
