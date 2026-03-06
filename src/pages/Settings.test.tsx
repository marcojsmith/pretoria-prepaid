import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Settings from "./Settings";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import * as pushNotifications from "@/lib/push-notifications";
import { Id } from "../../convex/_generated/dataModel";

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
    monthlyBudget: 500,
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
    expect(screen.getByLabelText(/monthly budget/i)).toHaveValue(500);
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
    fireEvent.change(screen.getByLabelText(/monthly budget/i), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText(/low balance threshold/i), {
      target: { value: "20" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        preferredName: "New Name",
        meterNumber: "0987654321",
        monthlyBudget: 1000,
        lowBalanceThreshold: 20,
        pushNotificationsEnabled: false,
        pushSubscription: undefined,
      });
    });

    expect(toast.success).toHaveBeenCalledWith("Settings updated successfully");
  });

  it("subscribes to push notifications when enabled", async () => {
    const mockSubscribe = vi.mocked(pushNotifications.subscribeUserToPush);
    mockSubscribe.mockResolvedValue({ endpoint: "test-endpoint" } as never);

    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const checkbox = screen.getByLabelText(/Push Notifications/i);
    fireEvent.click(checkbox);

    const submitButton = screen.getByRole("button", { name: /Save Settings/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockSubscribe).toHaveBeenCalled();
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        pushNotificationsEnabled: true,
        pushSubscription: { endpoint: "test-endpoint" },
      })
    );
  });

  it("unsubscribes from push notifications when disabled", async () => {
    const mockUpdateProfile = vi.fn().mockResolvedValue("id");
    const mockUnsubscribe = vi.mocked(pushNotifications.unsubscribeUserFromPush);
    mockUnsubscribe.mockResolvedValue(true);

    vi.mocked(useProfile).mockReturnValue({
      profile: {
        preferredName: "Test",
        pushNotificationsEnabled: true,
        pushSubscription: { endpoint: "old-endpoint" },
      },
      updateProfile: mockUpdateProfile,
      loading: false,
    } as never);

    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const checkbox = screen.getByLabelText(/Push Notifications/i);
    fireEvent.click(checkbox); // Toggle to false

    const submitButton = screen.getByRole("button", { name: /Save Settings/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        pushNotificationsEnabled: false,
        pushSubscription: undefined,
      })
    );
  });

  it("handles push subscription failure gracefully", async () => {
    const mockUpdateProfile = vi.fn();
    const mockSubscribe = vi.mocked(pushNotifications.subscribeUserToPush);
    mockSubscribe.mockResolvedValue(null); // Denied or error

    vi.mocked(useProfile).mockReturnValue({
      profile: {
        preferredName: "Test",
        pushNotificationsEnabled: false,
      },
      updateProfile: mockUpdateProfile,
      loading: false,
    } as never);

    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    const checkbox = screen.getByLabelText(/Push Notifications/i);
    fireEvent.click(checkbox);

    const submitButton = screen.getByRole("button", { name: /Save Settings/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockSubscribe).toHaveBeenCalled();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(checkbox).not.toBeChecked();
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
