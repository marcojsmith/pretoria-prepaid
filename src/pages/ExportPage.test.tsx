import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ExportPage from "./ExportPage";
import { usePurchases } from "../hooks/usePurchase";
import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import * as convexReact from "convex/react";

vi.mock("../hooks/usePurchase");
vi.mock("../hooks/useAuth");
vi.mock("../hooks/useUserRole");
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

describe("ExportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { id: "1", primaryEmailAddress: { emailAddress: "test@example.com" } },
      loading: false,
      signOut: vi.fn(),
    });
    (useUserRole as any).mockReturnValue({ loading: false, isAdmin: false });
    (convexReact.useQuery as any).mockReturnValue({ firstName: "Test" }); // Mock profile
  });

  it("renders correctly", () => {
    (usePurchases as any).mockReturnValue({
      loading: false,
      purchases: [],
      getMonthlyStats: () => [],
      getCurrentMonthPurchases: () => [],
      getAverageMonthlyUsage: () => 300,
    });

    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    expect(screen.getByTestId("export-user-data-card")).toBeInTheDocument();
    expect(screen.getAllByText(/Export My Data/i).length).toBeGreaterThan(0);
  });

  it("renders correctly for admins", () => {
    (useUserRole as any).mockReturnValue({ loading: false, isAdmin: true });
    (usePurchases as any).mockReturnValue({
      loading: false,
      purchases: [],
      getMonthlyStats: () => [],
      getCurrentMonthPurchases: () => [],
      getAverageMonthlyUsage: () => 300,
    });

    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
  });

  it("handles export data click", async () => {
    (usePurchases as any).mockReturnValue({
      loading: false,
      purchases: [{ _id: "1", amountPaid: 100, units: 30, date: "2024-01-01" }],
      getMonthlyStats: () => [],
      getCurrentMonthPurchases: () => [],
      getAverageMonthlyUsage: () => 300,
    });

    render(
      <BrowserRouter>
        <ExportPage />
      </BrowserRouter>
    );

    const exportButton = screen
      .getAllByText(/Export My Data/i)
      .find((el) => el.tagName === "BUTTON");
    await act(async () => {
      fireEvent.click(exportButton!);
    });

    // Verify some part of the JSON data is visible
    expect(screen.getByText((content) => content.includes("exported_at"))).toBeInTheDocument();
    expect(screen.getByText(/Copy/i)).toBeInTheDocument();
  });

  it("handles logout click", async () => {
    const signOut = vi.fn();
    (useAuth as any).mockReturnValue({ user: { id: "1" }, loading: false, signOut });
    (usePurchases as any).mockReturnValue({
      loading: false,
      purchases: [],
      getMonthlyStats: () => [],
      getCurrentMonthPurchases: () => [],
      getAverageMonthlyUsage: () => 300,
    });

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

    expect(signOut).toHaveBeenCalled();
  });
});
