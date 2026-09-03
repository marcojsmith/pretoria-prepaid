import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Settings from "./Settings";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import * as pushNotifications from "@/lib/push-notifications";
import type { Id } from "../../convex/_generated/dataModel";
import type { PushSubscriptionJSON } from "@/lib/push-notifications";

// Mock hooks
vi.mock("@/hooks/useAuth");
vi.mock("@/hooks/useProfile");
vi.mock("@/lib/push-notifications", () => ({
  subscribeUserToPush: vi.fn(),
  unsubscribeUserFromPush: vi.fn(),
  isPushSupported: vi.fn(() => true),
}));
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("@/hooks/useMeters", () => ({
  useMeters: vi.fn(() => ({
    meters: [],
    activeMeter: undefined,
    loading: false,
    setActiveMeter: vi.fn(),
    addMeter: vi.fn(),
    updateMeter: vi.fn(),
    archiveMeter: vi.fn(),
  })),
}));

describe("Settings Page", () => {
  const mockUser = {
    id: "1",
    primaryEmailAddress: { emailAddress: "test@example.com" },
  };

  const mockProfile = {
    preferredName: "Test User",
    meterNumber: "1234567890",
    lowBalanceThreshold: 10,
    pushNotificationsEnabled: false,
  };

  const mockUpdateProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as unknown as ReturnType<typeof useAuth>["user"],
      loading: false,
      signOut: vi.fn(),
    });
    vi.mocked(useProfile).mockReturnValue({
      profile: {
        ...mockProfile,
        _id: "user1" as unknown as Id<"profiles">,
        _creationTime: Date.now(),
        email: "test@example.com",
        userId: "clerk1",
      },
      updateProfile: mockUpdateProfile as unknown as ReturnType<typeof useProfile>["updateProfile"],
      loading: false,
    });
  });

  it("renders correctly with profile data", () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/preferred name/i)).toHaveValue("Test User");
  });

  it("no longer renders meterNumber or lowBalanceThreshold fields", () => {
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    expect(screen.queryByLabelText(/meter number/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/low balance threshold/i)).not.toBeInTheDocument();
  });

  it("handles form submission successfully", async () => {
    mockUpdateProfile.mockResolvedValueOnce("id");

    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/preferred name/i), {
      target: { value: "New Name" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        preferredName: "New Name",
        pushNotificationsEnabled: false,
      });
    });

    expect(toast.success).toHaveBeenCalledWith("Settings updated successfully");
  });

  it("subscribes to push notifications when enabled", async () => {
    const mockSubscribe = vi.mocked(pushNotifications.subscribeUserToPush);
    mockSubscribe.mockResolvedValue({ endpoint: "test-endpoint" } as PushSubscriptionJSON);

    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const checkbox = screen.getByLabelText(/Push Notifications/i);
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: /Save Settings/i }));

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalled();
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          pushNotificationsEnabled: true,
          pushSubscription: expect.objectContaining({ endpoint: expect.any(String) }),
        })
      );
    });
  });

  it("unsubscribes from push notifications when disabled", async () => {
    const mockUnsubscribe = vi.mocked(pushNotifications.unsubscribeUserFromPush);
    mockUnsubscribe.mockResolvedValue(true);

    vi.mocked(useProfile).mockReturnValue({
      profile: {
        _id: "user1" as unknown as Id<"profiles">,
        _creationTime: Date.now(),
        email: "test@example.com",
        userId: "clerk1",
        preferredName: "Test",
        meterNumber: "",
        lowBalanceThreshold: 10,
        pushNotificationsEnabled: true,
      },
      updateProfile: mockUpdateProfile as unknown as ReturnType<typeof useProfile>["updateProfile"],
      loading: false,
    });

    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const checkbox = screen.getByLabelText(/Push Notifications/i);
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: /Save Settings/i }));

    await waitFor(() => {
      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          pushNotificationsEnabled: false,
          pushSubscription: null,
        })
      );
    });
  });

  it("handles push subscription failure gracefully", async () => {
    const mockSubscribe = vi.mocked(pushNotifications.subscribeUserToPush);
    mockSubscribe.mockRejectedValueOnce(new Error("Notification permission denied"));

    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const checkbox = screen.getByLabelText(/Push Notifications/i);
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: /Save Settings/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Notification permission denied");
    });
  });

  it("handles submission errors", async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error("Update failed"));
    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update settings");
    });
  });

  it("shows loading state when profile is loading", () => {
    vi.mocked(useProfile).mockReturnValue({
      profile: undefined,
      loading: true,
      updateProfile: mockUpdateProfile as unknown as ReturnType<typeof useProfile>["updateProfile"],
    });

    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });
});
