import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { useAuth } from "../hooks/useAuth";
import { usePurchases } from "../hooks/usePurchase";
import { useUserRole } from "../hooks/useUserRole";

// Mock the hooks
vi.mock("../hooks/useAuth");
vi.mock("../hooks/usePurchase");
vi.mock("../hooks/useUserRole");

describe("Dashboard Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
