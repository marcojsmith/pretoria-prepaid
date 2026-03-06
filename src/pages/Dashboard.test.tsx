import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter, useNavigate } from "react-router-dom";
import Dashboard from "./Dashboard";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";
import { usePurchases } from "../hooks/usePurchase";
import { useUserRole } from "../hooks/useUserRole";
import { useRates, ElectricityRate } from "../hooks/useRates";
import { useConsumption } from "../hooks/useConsumption";
import { Id } from "../../convex/_generated/dataModel";

interface MockDropdownMenuProps {
  children?: React.ReactNode;
  onClick?: () => void;
}

// Mock the hooks
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});
vi.mock("../hooks/useAuth");
vi.mock("../hooks/useProfile");
vi.mock("../hooks/usePurchase");
vi.mock("../hooks/useUserRole");
vi.mock("../hooks/useRates");
vi.mock("../hooks/useConsumption");

// Mock DropdownMenu to render children directly for easier testing
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: MockDropdownMenuProps) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: MockDropdownMenuProps) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: MockDropdownMenuProps) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: MockDropdownMenuProps) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuLabel: ({ children }: MockDropdownMenuProps) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

const MOCK_RATES: ElectricityRate[] = [
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
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useRates).mockReturnValue({
      rates: MOCK_RATES,
      loading: false,
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
    vi.mocked(useConsumption).mockReturnValue({
      loading: false,
      stats: null,
      readings: [],
      addReading: vi.fn(),
      deleteReading: vi.fn(),
    });
  });

  const mockUseProfile = (overrides = {}) => {
    vi.mocked(useProfile).mockReturnValue({
      loading: false,
      profile: {
        preferredName: "Marco",
        monthlyBudget: 500,
        lowBalanceThreshold: 50,
        _id: "user1" as unknown as Id<"profiles">,
        _creationTime: Date.now(),
        email: "marco@example.com",
        userId: "clerk1",
      },
      updateProfile: vi.fn() as unknown as ReturnType<typeof useProfile>["updateProfile"],
      ...overrides,
    } as unknown as ReturnType<typeof useProfile>);
  };

  const mockUsePurchases = (overrides = {}) => {
    vi.mocked(usePurchases).mockReturnValue({
      loading: false,
      purchases: [],
      addPurchase: vi.fn(),
      addBatchPurchases: vi.fn(),
      deletePurchase: vi.fn(),
      unitsThisMonth: 100,
      costThisMonth: 342,
      getMonthlyStats: () => [],
      getAverageMonthlyUsage: () => 300,
      getCurrentMonthPurchases: () => [],
      getDailyAverageUsage: () => 10,
      getAverageMonthlyCost: () => 1000,
      getRefillAnalysis: () => [],
      offlineCount: 0,
      ...overrides,
    } as ReturnType<typeof usePurchases>);
  };

  it("renders loading state", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true, signOut: vi.fn() });
    mockUsePurchases({ loading: true });
    vi.mocked(useUserRole).mockReturnValue({ loading: true, isAdmin: false });
    mockUseProfile({ loading: true });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("renders dashboard with data", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        firstName: "Marco",
        primaryEmailAddress: { emailAddress: "marco@example.com" },
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut: vi.fn(),
    });
    const getCurrentMonthPurchases = vi.fn(() => []);
    mockUsePurchases({ getCurrentMonthPurchases });
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: false });
    mockUseProfile();

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getAllByText(/PowerTracker/i).length).toBeGreaterThan(0);
    expect(getCurrentMonthPurchases).toHaveBeenCalled();
  });

  it("renders for admin users", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        firstName: "Admin",
        primaryEmailAddress: { emailAddress: "admin@example.com" },
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut: vi.fn(),
    });
    mockUsePurchases();
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: true });
    mockUseProfile();

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    expect(screen.getAllByText(/PowerTracker/i).length).toBeGreaterThan(0);
  });

  it("handles logout click", async () => {
    const signOut = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        firstName: "Admin",
        primaryEmailAddress: { emailAddress: "admin@example.com" },
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut,
    });
    mockUsePurchases();
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: true });
    mockUseProfile();

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const logoutButton = screen.getByText(/Log out/i);
    expect(logoutButton).toBeInTheDocument();
    fireEvent.click(logoutButton);
    expect(signOut).toHaveBeenCalled();
  });

  it("navigates to calculator when calculator card clicked", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        firstName: "Marco",
        primaryEmailAddress: { emailAddress: "marco@example.com" },
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut: vi.fn(),
    });
    mockUsePurchases();
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: false });
    mockUseProfile();

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Buy Units"));
    expect(mockNavigate).toHaveBeenCalledWith("/calculator");
  });

  it("navigates to history when record card clicked", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        firstName: "Marco",
        primaryEmailAddress: { emailAddress: "marco@example.com" },
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut: vi.fn(),
    });
    mockUsePurchases();
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: false });
    mockUseProfile();

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Log Purchase"));
    expect(mockNavigate).toHaveBeenCalledWith("/history");
  });

  it("navigates to history with meter state when meter card clicked", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        firstName: "Marco",
        primaryEmailAddress: { emailAddress: "marco@example.com" },
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut: vi.fn(),
    });
    mockUsePurchases();
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: false });
    mockUseProfile();

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Meter Reading"));
    expect(mockNavigate).toHaveBeenCalledWith("/history", { state: { showReadings: true } });
  });

  it("navigates to rates when View All Rates clicked", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        firstName: "Marco",
        primaryEmailAddress: { emailAddress: "marco@example.com" },
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut: vi.fn(),
    });
    mockUsePurchases();
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: false });
    mockUseProfile();

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("View All Rates"));
    expect(mockNavigate).toHaveBeenCalledWith("/rates");
  });
});
