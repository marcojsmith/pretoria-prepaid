import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProfile } from "./useProfile";
import { useQuery, useMutation } from "convex/react";
import * as pushNotifications from "@/lib/push-notifications";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("@/lib/push-notifications", () => ({
  subscribeUserToPush: vi.fn(),
  isPushSupported: vi.fn(() => true),
}));

describe("useProfile", () => {
  const mockUpdateProfile = Object.assign(vi.fn(), {
    withOptimisticUpdate: vi.fn().mockReturnThis(),
  });
  const mockUpdatePushSubscription = Object.assign(vi.fn(), {
    withOptimisticUpdate: vi.fn().mockReturnThis(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    vi.mocked(useMutation).mockReturnValue(mockUpdateProfile as any);
  });

  it("should return loading state when profile is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    const { result } = renderHook(() => useProfile());

    expect(result.current.loading).toBe(true);
    expect(result.current.profile).toBeUndefined();
  });

  it("should return profile when loaded", () => {
    const mockProfile = { id: "1", preferredName: "Test User" };
    vi.mocked(useQuery).mockReturnValue(mockProfile);

    const { result } = renderHook(() => useProfile());

    expect(result.current.loading).toBe(false);
    expect(result.current.profile).toEqual(mockProfile);
  });

  it("should sync push subscription when enabled and different", async () => {
    const mockProfile = {
      pushNotificationsEnabled: true,
      pushSubscription: { endpoint: "old-endpoint", keys: { auth: "a", p256dh: "b" } },
    };
    vi.mocked(useQuery).mockReturnValue(mockProfile);

    // Ordered returns for the two useMutation calls in useProfile hook
    vi.mocked(useMutation)
      .mockReturnValueOnce(mockUpdateProfile as any)
      .mockReturnValueOnce(mockUpdatePushSubscription as any);

    const mockSubscription = { endpoint: "new-endpoint", keys: { auth: "1", p256dh: "2" } };
    vi.mocked(pushNotifications.subscribeUserToPush).mockResolvedValue(mockSubscription as any);

    renderHook(() => useProfile());

    await waitFor(
      () => {
        expect(pushNotifications.subscribeUserToPush).toHaveBeenCalled();
        expect(mockUpdatePushSubscription).toHaveBeenCalledWith({
          pushNotificationsEnabled: true,
          pushSubscription: mockSubscription,
        });
      },
      { timeout: 2000 }
    );
  });

  it("should not sync if subscription is the same", async () => {
    const mockSubscription = { endpoint: "same-endpoint", keys: { auth: "1", p256dh: "2" } };
    const mockProfile = {
      pushNotificationsEnabled: true,
      pushSubscription: mockSubscription,
    };
    vi.mocked(useQuery).mockReturnValue(mockProfile);
    vi.mocked(useMutation)
      .mockReturnValueOnce(mockUpdateProfile as any)
      .mockReturnValueOnce(mockUpdatePushSubscription as any);
    vi.mocked(pushNotifications.subscribeUserToPush).mockResolvedValue(mockSubscription as any);

    renderHook(() => useProfile());

    await waitFor(() => {
      expect(pushNotifications.subscribeUserToPush).toHaveBeenCalled();
    });

    expect(mockUpdatePushSubscription).not.toHaveBeenCalled();
  });

  it("should handle null subscription from subscribeUserToPush", async () => {
    const mockProfile = {
      pushNotificationsEnabled: true,
    };
    vi.mocked(useQuery).mockReturnValue(mockProfile);
    vi.mocked(pushNotifications.subscribeUserToPush).mockResolvedValue(null as any);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    renderHook(() => useProfile());

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("No push subscription available.");
    });

    consoleSpy.mockRestore();
  });

  it("should handle error during silent sync gracefully", async () => {
    const mockProfile = {
      pushNotificationsEnabled: true,
    };
    vi.mocked(useQuery).mockReturnValue(mockProfile);
    vi.mocked(useMutation)
      .mockReturnValueOnce(mockUpdateProfile as any)
      .mockReturnValueOnce(mockUpdatePushSubscription as any);
    vi.mocked(pushNotifications.subscribeUserToPush).mockRejectedValue(new Error("Sync error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderHook(() => useProfile());

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to silently sync push subscription:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("should not sync if push is not supported", async () => {
    vi.mocked(pushNotifications.isPushSupported).mockReturnValue(false);
    const mockProfile = {
      pushNotificationsEnabled: true,
    };
    vi.mocked(useQuery).mockReturnValue(mockProfile);

    renderHook(() => useProfile());

    // Wait a bit to ensure it didn't call subscribe
    await new Promise((r) => setTimeout(r, 50));
    expect(pushNotifications.subscribeUserToPush).not.toHaveBeenCalled();
  });
});
