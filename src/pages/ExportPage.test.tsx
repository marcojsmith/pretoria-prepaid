import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ExportPage from "./ExportPage";
import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { usePurchases } from "../hooks/usePurchase";
import { useToast } from "../hooks/use-toast";
import { useQuery } from "convex/react";

// Mock everything
vi.mock("../hooks/useAuth");
vi.mock("../hooks/useUserRole");
vi.mock("../hooks/usePurchase");
vi.mock("../hooks/use-toast");
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

describe("ExportPage", () => {
  const mockSignOut = vi.fn();
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { primaryEmailAddress: { emailAddress: "test@example.com" } } as unknown as ReturnType<
        typeof useAuth
      >["user"],
      loading: false,
      signOut: mockSignOut,
    });
    vi.mocked(useUserRole).mockReturnValue({ isAdmin: false, loading: false });
    vi.mocked(usePurchases).mockReturnValue({
      loading: false,
      purchases: [],
      addPurchase: vi.fn(),
      deletePurchase: vi.fn(),
      unitsThisMonth: 0,
      costThisMonth: 0,
      getMonthlyStats: vi.fn(() => []),
      getAverageMonthlyUsage: vi.fn(() => 0),
      getDailyAverageUsage: vi.fn(() => 0),
      getAverageMonthlyCost: vi.fn(() => 0),
      getCurrentMonthPurchases: vi.fn(() => []),
      offlineCount: 0,
    } as ReturnType<typeof usePurchases>);
    vi.mocked(useToast).mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    } as ReturnType<typeof useToast>);
    vi.mocked(useQuery).mockReturnValue({});

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders correctly", () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );
    expect(screen.getAllByText(/Export My Data/i).length).toBeGreaterThan(0);
  });

  it("shows loading state when auth or role is loading", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true, signOut: vi.fn() });
    const { container } = render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("handles export and copy to clipboard", async () => {
    vi.mocked(useQuery).mockImplementation(() => {
      // Return specific data for profile and purchases queries
      return { id: "1", mock: "data" };
    });

    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const exportButton = screen.getByRole("button", { name: /Export My Data/i });

    await act(async () => {
      fireEvent.click(exportButton);
    });

    expect(screen.getByText(/"mock": "data"/i)).toBeInTheDocument();

    const copyButton = screen.getByRole("button", { name: /Copy/i });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Copied" }));
  });

  it("shows admin section for admin users", () => {
    vi.mocked(useUserRole).mockReturnValue({ isAdmin: true, loading: false });

    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
  });

  it("handles logout", async () => {
    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const logoutButton = screen
      .getAllByRole("button")
      .find((b) => b.querySelector(".lucide-log-out"));
    await act(async () => {
      fireEvent.click(logoutButton!);
    });

    expect(mockSignOut).toHaveBeenCalled();
  });
});
