import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Settings from "./Settings";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

// Mock hooks
vi.mock("@/hooks/useAuth");
vi.mock("@/hooks/useProfile");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Settings Page", () => {
  const mockUser = {
    primaryEmailAddress: { emailAddress: "test@example.com" },
  };

  const mockProfile = {
    preferredName: "Test User",
    meterNumber: "1234567890",
    monthlyBudget: 500,
  };

  const mockUpdateProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: mockUser,
      loading: false,
    });
    (useProfile as any).mockReturnValue({
      profile: mockProfile,
      updateProfile: mockUpdateProfile,
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

    fireEvent.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        preferredName: "New Name",
        meterNumber: "0987654321",
        monthlyBudget: 1000,
      });
      expect(toast.success).toHaveBeenCalledWith("Settings updated successfully");
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
    (useProfile as any).mockReturnValue({
      profile: undefined,
      loading: true,
      updateProfile: mockUpdateProfile,
    });

    render(
      <BrowserRouter>
        <Settings />
      </BrowserRouter>
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });
});
