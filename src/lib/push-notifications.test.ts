import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isPushSupported,
  subscribeUserToPush,
  unsubscribeUserFromPush,
} from "./push-notifications";

describe("push-notifications", () => {
  const mockServiceWorker = {
    ready: Promise.resolve({
      pushManager: {
        getSubscription: vi.fn(),
        subscribe: vi.fn(),
      },
    }),
  };

  const mockNotification = {
    requestPermission: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal("navigator", {
      serviceWorker: mockServiceWorker,
    });
    vi.stubGlobal("window", {
      atob: (str: string) => Buffer.from(str, "base64").toString("binary"),
      PushManager: {},
    });
    vi.stubGlobal("Notification", mockNotification);

    // Mock VITE_VAPID_PUBLIC_KEY
    vi.stubEnv("VITE_VAPID_PUBLIC_KEY", "VITE_VAPID_PUBLIC_KEY_PLACEHOLDER");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("checks if push is supported", () => {
    expect(isPushSupported()).toBe(true);
  });

  it("subscribes user to push when permission is granted", async () => {
    mockNotification.requestPermission.mockResolvedValue("granted");
    const mockSubscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/test",
      toJSON: () => ({ endpoint: "https://fcm.googleapis.com/fcm/send/test" }),
    };

    const registration = await mockServiceWorker.ready;
    vi.mocked(registration.pushManager.getSubscription).mockResolvedValue(null);
    vi.mocked(registration.pushManager.subscribe).mockResolvedValue(
      mockSubscription as unknown as PushSubscription
    );

    const result = await subscribeUserToPush();

    expect(mockNotification.requestPermission).toHaveBeenCalled();
    expect(registration.pushManager.subscribe).toHaveBeenCalled();
    expect(result).toEqual({ endpoint: "https://fcm.googleapis.com/fcm/send/test" });
  });

  it("returns null when permission is denied", async () => {
    mockNotification.requestPermission.mockResolvedValue("denied");
    const result = await subscribeUserToPush();
    expect(result).toBeNull();
  });

  it("unsubscribes user from push", async () => {
    const mockSubscription = {
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    const registration = await mockServiceWorker.ready;
    vi.mocked(registration.pushManager.getSubscription).mockResolvedValue(
      mockSubscription as unknown as PushSubscription
    );

    const result = await unsubscribeUserFromPush();

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
