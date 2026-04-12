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
    expect(screen.getByLabelText(/meter number/i)).toHaveValue("1234567890");
    expect(screen.getByLabelText(/low balance threshold/i)).toHaveValue(10);
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
    fireEvent.change(screen.getByLabelText(/meter number/i), {
      target: { value: "0987654321" },
    });
    fireEvent.change(screen.getByLabelText(/low balance threshold/i), {
      target: { value: "20" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        preferredName: "New Name",
        meterNumber: "0987654321",
        lowBalanceThreshold: 20,
        pushNotificationsEnabled: false,
        pushSubscription: undefined,
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
        })
      );
    });
  });

  it("handles push subscription failure gracefully", async () => {
    const mockSubscribe = vi.mocked(pushNotifications.subscribeUserToPush);
    mockSubscribe.mockRejectedValue(new Error("Notification permission denied"));

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
