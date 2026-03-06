/**
 * Converts a base64 string to a Uint8Array.
 * Required for the browser's PushManager.subscribe() method.
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
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
export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Requests permission for notifications and subscribes the user to push.
 * @returns The subscription object.
 * @throws Error if failed or denied.
 */
export async function subscribeUserToPush() {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser.");
  }

  try {
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
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
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

    return JSON.parse(JSON.stringify(subscription));
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
export async function unsubscribeUserFromPush() {
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
