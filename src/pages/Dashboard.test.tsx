import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { useAuth } from "../hooks/useAuth";
import { usePurchases } from "../hooks/usePurchase";
import { useUserRole } from "../hooks/useUserRole";
import { useRates } from "../hooks/useRates";

// Mock the hooks
vi.mock("../hooks/useAuth");
vi.mock("../hooks/usePurchase");
vi.mock("../hooks/useUserRole");
vi.mock("../hooks/useRates");

const MOCK_RATES = [
  { _id: "1", tier_number: 1, tier_label: "Tier 1", min_units: 1, max_units: 100, rate: 3.42585 },
  { _id: "2", tier_number: 2, tier_label: "Tier 2", min_units: 101, max_units: 400, rate: 4.00936 },
  { _id: "3", tier_number: 3, tier_label: "Tier 3", min_units: 401, max_units: 650, rate: 4.36816 },
  {
    _id: "4",
    tier_number: 4,
    tier_label: "Tier 4",
    min_units: 651,
    max_units: null,
    rate: 4.70902,
  },
];

describe("Dashboard Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRates as any).mockReturnValue({ rates: MOCK_RATES, loading: false });
  });

  const mockUsePurchases = (overrides = {}) => {
    (usePurchases as any).mockReturnValue({
      loading: false,
      purchases: [],
      unitsThisMonth: 100,
      costThisMonth: 342,
      getMonthlyStats: () => [],
      getAverageMonthlyUsage: () => 300,
      getCurrentMonthPurchases: () => [],
      getDailyAverageUsage: () => 10,
      getAverageMonthlyCost: () => 1000,
      ...overrides,
    });
  };

  it("renders loading state", () => {
    (useAuth as any).mockReturnValue({ user: null, loading: true });
    mockUsePurchases({ loading: true });
    (useUserRole as any).mockReturnValue({ loading: true, role: null });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("renders dashboard with data", () => {
    (useAuth as any).mockReturnValue({
      user: { firstName: "Marco", primaryEmailAddress: { emailAddress: "marco@example.com" } },
      loading: false,
    });
    const getCurrentMonthPurchases = vi.fn(() => []);
    mockUsePurchases({ getCurrentMonthPurchases });
    (useUserRole as any).mockReturnValue({ loading: false, role: "user" });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getAllByText(/PowerTracker/i).length).toBeGreaterThan(0);
    expect(getCurrentMonthPurchases).toHaveBeenCalled();
  });

  it("renders for admin users", () => {
    (useAuth as any).mockReturnValue({
      user: { firstName: "Admin", primaryEmailAddress: { emailAddress: "admin@example.com" } },
      loading: false,
    });
    mockUsePurchases();
    (useUserRole as any).mockReturnValue({ loading: false, role: "admin", isAdmin: true });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getAllByText(/PowerTracker/i).length).toBeGreaterThan(0);
  });

  it("handles logout click", () => {
    const signOut = vi.fn();
    (useAuth as any).mockReturnValue({
      user: { firstName: "Admin", primaryEmailAddress: { emailAddress: "admin@example.com" } },
      loading: false,
      signOut,
    });
    mockUsePurchases();
    (useUserRole as any).mockReturnValue({ loading: false, role: "admin", isAdmin: true });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const logoutButton = screen
      .getAllByRole("button")
      .find((b) => b.querySelector(".lucide-log-out"));
    expect(logoutButton).toBeInTheDocument();
    logoutButton?.click();
    expect(signOut).toHaveBeenCalled();
  });
});
