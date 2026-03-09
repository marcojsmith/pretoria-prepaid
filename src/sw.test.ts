import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { precacheAndRoute } from "workbox-precaching";

// Mock workbox-precaching
vi.mock("workbox-precaching", () => ({
  precacheAndRoute: vi.fn(),
  cleanupOutdatedCaches: vi.fn(),
}));

describe("Service Worker", () => {
  const mockManifest = [{ url: "/index.html", revision: "1" }];

  // Define a reusable mockSelf
  const mockSelf = {
    __WB_MANIFEST: mockManifest,
    addEventListener: vi.fn(),
    location: { origin: "http://localhost" },
    registration: {
      showNotification: vi.fn().mockResolvedValue(undefined),
      pushManager: {
        subscribe: vi.fn(),
      },
    },
    clients: {
      openWindow: vi.fn().mockResolvedValue({ focus: vi.fn() }),
      matchAll: vi.fn().mockResolvedValue([]),
    },
  };

  let pushListener: (event: any) => void;
  let clickListener: (event: any) => void;
  let pscListener: (event: any) => void;

  beforeAll(async () => {
    vi.stubGlobal("self", mockSelf);
    await import("./sw");

    const addEventListenerMock = vi.mocked(self.addEventListener);
    pushListener = addEventListenerMock.mock.calls.find(
      (c) => (c[0] as string) === "push"
    )?.[1] as any;
    clickListener = addEventListenerMock.mock.calls.find(
      (c) => (c[0] as string) === "notificationclick"
    )?.[1] as any;
    pscListener = addEventListenerMock.mock.calls.find(
      (c) => (c[0] as string) === "pushsubscriptionchange"
    )?.[1] as any;
  });

  beforeEach(() => {
    vi.mocked((self as any).registration.showNotification).mockClear();
    vi.mocked((self as any).clients.openWindow).mockClear();
    vi.mocked((self as any).clients.matchAll).mockClear();

    vi.stubGlobal("navigator", {});
  });

  it("should initialize correctly and register precache route", async () => {
    expect(precacheAndRoute).toHaveBeenCalledWith(mockManifest);
    expect(pushListener).toBeDefined();
    expect(clickListener).toBeDefined();
    expect(pscListener).toBeDefined();
  });

  it("handles push event correctly", async () => {
    const mockEvent = {
      data: {
        json: () => ({
          title: "Test Title",
          body: "Test Body",
          data: { url: "/test" },
        }),
      },
      waitUntil: vi.fn(),
    };

    pushListener(mockEvent);
    expect(mockEvent.waitUntil).toHaveBeenCalled();
    expect((self as any).registration.showNotification).toHaveBeenCalledWith(
      "Test Title",
      expect.any(Object)
    );
  });

  it("handles push event with unreadCount and App Badge API", async () => {
    const mockSetAppBadge = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { setAppBadge: mockSetAppBadge });

    const mockEvent = {
      data: {
        json: () => ({
          title: "Test Title",
          body: "Test Body",
          unreadCount: 5,
        }),
      },
      waitUntil: vi.fn(),
    };

    pushListener(mockEvent);
    expect(mockSetAppBadge).toHaveBeenCalledWith(5);
  });

  it("handles push event with App Badge API failure gracefully", async () => {
    let resolveBadgeError: (value: unknown) => void;
    const badgeErrorPromise = new Promise((resolve) => {
      resolveBadgeError = resolve;
    });

    const mockSetAppBadge = vi.fn().mockImplementation(() => {
      return Promise.reject(new Error("Badge error")).catch((err) => {
        throw err;
      });
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation((msg) => {
      if (msg === "Failed to set app badge:") {
        resolveBadgeError(true);
      }
    });

    vi.stubGlobal("navigator", { setAppBadge: mockSetAppBadge });

    const mockEvent = {
      data: {
        json: () => ({
          title: "Test Title",
          body: "Test Body",
        }),
      },
      waitUntil: vi.fn(),
    };

    pushListener(mockEvent);
    await badgeErrorPromise;
    expect(consoleSpy).toHaveBeenCalledWith("Failed to set app badge:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("handles push event with App Badge API fallback error", async () => {
    const mockSetAppBadge = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { setAppBadge: mockSetAppBadge });

    const mockEvent = {
      data: {
        json: () => ({
          title: "Test",
          body: "Body",
          unreadCount: 0,
        }),
      },
      waitUntil: vi.fn(),
    };

    pushListener(mockEvent);
    expect(mockSetAppBadge).toHaveBeenCalledWith(0);
  });

  it("handles notificationclick and focuses existing window", async () => {
    const mockClient = {
      url: "http://localhost/dashboard",
      focus: vi.fn().mockResolvedValue(undefined),
      navigate: vi.fn().mockResolvedValue(undefined),
    };

    (self as any).clients.matchAll = vi.fn().mockResolvedValue([mockClient]);

    let capturedPromise: Promise<void> | undefined;
    const mockEvent = {
      notification: {
        close: vi.fn(),
        data: { url: "/test" },
      },
      waitUntil: vi.fn((promise) => {
        capturedPromise = promise;
      }),
    };

    clickListener(mockEvent);
    if (capturedPromise) await capturedPromise;

    expect(mockEvent.notification.close).toHaveBeenCalled();
    expect(mockClient.focus).toHaveBeenCalled();
    expect(mockClient.navigate).toHaveBeenCalledWith("http://localhost/test");
  });

  it("handles notificationclick and opens new window when no client exists", async () => {
    (self as any).clients.matchAll = vi.fn().mockResolvedValue([]);
    (self as any).clients.openWindow = vi.fn().mockResolvedValue({ focus: vi.fn() });

    let capturedPromise: Promise<void> | undefined;
    const mockEvent = {
      notification: {
        close: vi.fn(),
        data: { url: "/test" },
      },
      waitUntil: vi.fn((promise) => {
        capturedPromise = promise;
      }),
    };

    clickListener(mockEvent);
    if (capturedPromise) await capturedPromise;

    expect((self as any).clients.openWindow).toHaveBeenCalledWith("http://localhost/test");
  });

  it("handles notificationclick and clears app badge with failure", async () => {
    const mockClearAppBadge = vi.fn().mockRejectedValue(new Error("Clear failed"));
    vi.stubGlobal("navigator", { clearAppBadge: mockClearAppBadge });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    let capturedPromise: Promise<void> | undefined;
    const mockEvent = {
      notification: {
        close: vi.fn(),
        data: { url: "/test" },
      },
      waitUntil: vi.fn((promise) => {
        capturedPromise = promise;
      }),
    };

    clickListener(mockEvent);
    if (capturedPromise) await capturedPromise;

    expect(mockClearAppBadge).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("Failed to clear app badge:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("handles push event with invalid JSON data and fallback badge", async () => {
    const mockSetAppBadge = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { setAppBadge: mockSetAppBadge });

    const mockEvent = {
      data: {
        json: () => {
          throw new Error("Invalid JSON");
        },
      },
      waitUntil: vi.fn(),
    };

    pushListener(mockEvent);
    expect(mockEvent.waitUntil).toHaveBeenCalled();
    expect(mockSetAppBadge).toHaveBeenCalled();
    expect((self as any).registration.showNotification).toHaveBeenCalledWith(
      "Pretoria Prepaid",
      expect.any(Object)
    );
  });

  it("handles pushsubscriptionchange event with direct new subscription", async () => {
    const mockNewSubscription = { endpoint: "new-endpoint" };
    const mockEvent = {
      newSubscription: mockNewSubscription,
      waitUntil: vi.fn(),
    };

    pscListener(mockEvent);
    expect(mockEvent.waitUntil).toHaveBeenCalled();
  });

  it("handles pushsubscriptionchange event with re-subscription using old key", async () => {
    const mockOldSubscription = {
      options: { applicationServerKey: "old-key" },
    };
    const mockNewSubscription = { endpoint: "re-subscribed-endpoint" };

    (self as any).registration.pushManager.subscribe = vi
      .fn()
      .mockResolvedValue(mockNewSubscription);

    let capturedPromise: Promise<void> | undefined;
    const mockEvent = {
      oldSubscription: mockOldSubscription,
      waitUntil: vi.fn((promise) => {
        capturedPromise = promise;
      }),
    };

    pscListener(mockEvent);
    if (capturedPromise) await capturedPromise;

    expect((self as any).registration.pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: "old-key",
    });
  });

  it("handles pushsubscriptionchange event failure gracefully", async () => {
    const mockOldSubscription = {
      options: { applicationServerKey: "old-key" },
    };

    (self as any).registration.pushManager.subscribe = vi
      .fn()
      .mockRejectedValue(new Error("Subscribe failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    let capturedPromise: Promise<void> | undefined;
    const mockEvent = {
      oldSubscription: mockOldSubscription,
      waitUntil: vi.fn((promise) => {
        capturedPromise = promise;
      }),
    };

    pscListener(mockEvent);
    if (capturedPromise) await capturedPromise;

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to re-subscribe after pushsubscriptionchange:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
