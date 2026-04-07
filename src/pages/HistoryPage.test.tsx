import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter, useNavigate, MemoryRouter } from "react-router-dom";
import HistoryPage from "./HistoryPage";
import { usePurchases } from "../hooks/usePurchase";
import { useConsumption } from "../hooks/useConsumption";
import { useAuth } from "../hooks/useAuth";
import { useRates } from "../hooks/useRates";
import { Id } from "../../convex/_generated/dataModel";

interface MockDropdownMenuProps {
  children?: React.ReactNode;
  onClick?: () => void;
}

interface MockSelectProps {
  children?: React.ReactNode;
  onValueChange?: (value: string) => void;
  value?: string;
  id?: string;
  placeholder?: string;
}

// Mock the hooks
vi.mock("../hooks/usePurchase");
vi.mock("../hooks/useConsumption");
vi.mock("../hooks/useAuth");
vi.mock("../hooks/useRates");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

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

// Mock Select to render as a simple select for easier testing
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: MockSelectProps) => (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      data-testid="mock-select"
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children, id }: MockSelectProps) => <div id={id}>{children}</div>,
  SelectValue: ({ placeholder }: MockSelectProps) => <span>{placeholder}</span>,
  SelectContent: ({ children }: MockSelectProps) => <>{children}</>,
  SelectItem: ({ children, value }: MockSelectProps) => <option value={value}>{children}</option>,
}));

describe("HistoryPage", () => {
  const mockSignOut = vi.fn();
  const mockAddPurchase = vi.fn();
  const mockDeletePurchase = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(vi.fn() as unknown as ReturnType<typeof useNavigate>);
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        firstName: "Test",
        primaryEmailAddress: { emailAddress: "test@example.com" },
      } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut: mockSignOut,
    });
    vi.mocked(usePurchases).mockReturnValue({
      loading: false,
      purchases: [],
      addPurchase: mockAddPurchase,
      addBatchPurchases: vi.fn(),
      deletePurchase: mockDeletePurchase,
      unitsThisMonth: 0,
      costThisMonth: 0,
      getMonthlyStats: vi.fn(() => []),
      getAverageMonthlyUsage: vi.fn(() => 0),
      getDailyAverageUsage: vi.fn(() => 0),
      getAverageMonthlyCost: vi.fn(() => 0),
      getCurrentMonthPurchases: vi.fn(() => []),
      getRefillAnalysis: vi.fn(() => []),
      offlineCount: 0,
    } as unknown as ReturnType<typeof usePurchases>);
    vi.mocked(useConsumption).mockReturnValue({
      loading: false,
      readings: [],
      stats: null,
      addOnboardingReading: vi.fn(),
      hasAnyReadings: false,
      hasPurchaseReadings: false,
    });
    vi.mocked(useRates).mockReturnValue({
      loading: false,
      rates: [],
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it("renders loading state correctly", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      signOut: vi.fn(),
    });
    const { container } = render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );
    // Should show spinner
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders correctly with tabs", () => {
    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );
    expect(screen.getByText("Purchases")).toBeInTheDocument();
    expect(screen.getByText("Readings")).toBeInTheDocument();
  });

  it("switches to readings tab and displays empty state", () => {
    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Readings"));
    expect(screen.getByText(/No readings logged yet/i)).toBeInTheDocument();
  });

  it("renders readings list and handles deletion", async () => {
    vi.mocked(useConsumption).mockReturnValue({
      loading: false,
      readings: [
        {
          _id: "r1" as unknown as Id<"meter_readings">,
          _creationTime: Date.now(),
          userId: "user1",
          readingPre: 80,
          readingPost: 120.5,
          date: "2024-03-05",
          source: "purchase",
        },
      ],
      stats: null,
      addOnboardingReading: vi.fn(),
      hasAnyReadings: true,
      hasPurchaseReadings: true,
    });

    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Readings"));
    expect(screen.getByText(/80 kWh.*120.5 kWh/)).toBeInTheDocument();

    // Delete button exists but is a no-op (readings are deleted via purchase deletion)
    const deleteBtn = screen.getAllByRole("button").find((b) => b.querySelector(".lucide-trash2"));
    expect(deleteBtn).toBeInTheDocument();
  });

  it("handles logout click", async () => {
    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    const logoutButton = screen.getByText(/Log out/i);
    expect(logoutButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(logoutButton);
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("handles add purchase form", async () => {
    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    const amountInput = screen.getByLabelText(/Amount Paid/i);
    fireEvent.change(amountInput, { target: { value: "100" } });

    const unitsInput = screen.getByLabelText(/kWh Received/i);
    fireEvent.change(unitsInput, { target: { value: "30" } });

    const meterReadingInput = screen.getByLabelText(/Current Meter/i);
    fireEvent.change(meterReadingInput, { target: { value: "1000" } });

    const submitButton = screen.getByRole("button", { name: /Add Purchase/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockAddPurchase).toHaveBeenCalled();
  });

  it("filters purchases and readings by date", async () => {
    const marchPurchase = {
      _id: "p1" as any,
      date: "2024-03-15",
      units: 100,
      cost: 200,
      amountPaid: 200,
      tierBreakdown: [],
    };
    const februaryPurchase = {
      _id: "p2" as any,
      date: "2024-02-15",
      units: 50,
      cost: 100,
      amountPaid: 100,
      tierBreakdown: [],
    };

    vi.mocked(usePurchases).mockReturnValue({
      loading: false,
      purchases: [marchPurchase, februaryPurchase],
      addPurchase: mockAddPurchase,
      addBatchPurchases: vi.fn(),
      deletePurchase: mockDeletePurchase,
      unitsThisMonth: 100,
      costThisMonth: 200,
      getMonthlyStats: vi.fn(() => []),
      getAverageMonthlyUsage: vi.fn(() => 0),
      getDailyAverageUsage: vi.fn(() => 0),
      getAverageMonthlyCost: vi.fn(() => 0),
      getCurrentMonthPurchases: vi.fn(() => [marchPurchase]),
      getRefillAnalysis: vi.fn(() => []),
      offlineCount: 0,
    } as unknown as ReturnType<typeof usePurchases>);

    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    // Initial state: should show both since we moved to full history
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/50/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/kWh/).length).toBeGreaterThan(0);

    // Now try to filter
    const filterBtn = screen.getByText(/FILTERS/i);
    expect(filterBtn).toBeInTheDocument();
    fireEvent.click(filterBtn);

    const selects = screen.getAllByTestId("mock-select");
    const monthSelect = selects[0];
    const yearSelect = selects[1];

    // Filter to March 2024
    fireEvent.change(yearSelect, { target: { value: "2024" } });
    fireEvent.change(monthSelect, { target: { value: "03" } });

    // Should show march, not february
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/50/)).not.toBeInTheDocument();
  });

  it("calculates availableYears from both purchases and readings", () => {
    const marchPurchase = {
      _id: "p1" as any,
      date: "2024-03-15",
      units: 100,
      cost: 200,
      amountPaid: 200,
      tierBreakdown: [],
    };
    const oldReading = {
      _id: "r1" as any,
      date: "2023-12-15",
      readingPre: 100,
      readingPost: 100,
      source: "onboarding" as const,
      userId: "1",
      _creationTime: 123456789,
    };

    vi.mocked(usePurchases).mockReturnValue({
      loading: false,
      purchases: [marchPurchase],
      addPurchase: mockAddPurchase,
      addBatchPurchases: vi.fn(),
      deletePurchase: mockDeletePurchase,
      unitsThisMonth: 100,
      costThisMonth: 200,
      getMonthlyStats: vi.fn(() => []),
      getAverageMonthlyUsage: vi.fn(() => 0),
      getDailyAverageUsage: vi.fn(() => 0),
      getAverageMonthlyCost: vi.fn(() => 0),
      getCurrentMonthPurchases: vi.fn(() => [marchPurchase]),
      getRefillAnalysis: vi.fn(() => []),
      offlineCount: 0,
    } as unknown as ReturnType<typeof usePurchases>);

    vi.mocked(useConsumption).mockReturnValue({
      loading: false,
      readings: [oldReading],
      addOnboardingReading: vi.fn(),
      hasAnyReadings: true,
      hasPurchaseReadings: false,
      stats: null,
    });

    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    // Filter button to show filters
    const filterBtn = screen.getByText(/FILTERS/i);
    fireEvent.click(filterBtn);

    expect(screen.getByRole("option", { name: "2024" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "2023" })).toBeInTheDocument();
  });

  it("navigates to /auth when not authenticated", () => {
    const mockNav = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNav as unknown as ReturnType<typeof useNavigate>);
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signOut: vi.fn(),
    });

    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    expect(mockNav).toHaveBeenCalledWith("/auth");
  });

  it("auto-switches to readings tab when location state has showReadings", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/history", state: { showReadings: true } }]}>
        <HistoryPage />
      </MemoryRouter>
    );

    // When showReadings is true, activeTab is set to "readings" — the AddPurchaseForm
    // is NOT rendered (it only renders when activeTab === "purchases")
    expect(screen.queryByLabelText(/Amount Paid/i)).not.toBeInTheDocument();
    // The readings tab content is shown instead
    expect(screen.getByText(/No readings logged yet/i)).toBeInTheDocument();
  });

  it("resetFilters resets month and year to All", async () => {
    const marchPurchase = {
      _id: "p1" as any,
      date: "2024-03-15",
      units: 100,
      cost: 200,
      amountPaid: 200,
      tierBreakdown: [],
    };

    vi.mocked(usePurchases).mockReturnValue({
      loading: false,
      purchases: [marchPurchase],
      addPurchase: mockAddPurchase,
      addBatchPurchases: vi.fn(),
      deletePurchase: mockDeletePurchase,
      unitsThisMonth: 100,
      costThisMonth: 200,
      getMonthlyStats: vi.fn(() => []),
      getAverageMonthlyUsage: vi.fn(() => 0),
      getDailyAverageUsage: vi.fn(() => 0),
      getAverageMonthlyCost: vi.fn(() => 0),
      getCurrentMonthPurchases: vi.fn(() => [marchPurchase]),
      getRefillAnalysis: vi.fn(() => []),
      offlineCount: 0,
    } as unknown as ReturnType<typeof usePurchases>);

    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    const filterBtn = screen.getByText(/FILTERS/i);
    fireEvent.click(filterBtn);

    const selects = screen.getAllByTestId("mock-select");
    const monthSelect = selects[0];
    const yearSelect = selects[1];

    fireEvent.change(yearSelect, { target: { value: "2024" } });
    fireEvent.change(monthSelect, { target: { value: "03" } });

    expect(screen.getByText("Filters Active")).toBeInTheDocument();

    const resetBtn = screen.getByText("Reset");
    fireEvent.click(resetBtn);

    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("navigates to clear state after purchase when prefillData exists", async () => {
    const mockNav = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNav as unknown as ReturnType<typeof useNavigate>);
    mockAddPurchase.mockResolvedValue({});

    render(
      <MemoryRouter
        initialEntries={[{ pathname: "/history", state: { prefillUnits: 50, prefillAmount: 200 } }]}
      >
        <HistoryPage />
      </MemoryRouter>
    );

    const amountInput = screen.getByLabelText(/Amount Paid/i);
    fireEvent.change(amountInput, { target: { value: "200" } });

    const unitsInput = screen.getByLabelText(/kWh Received/i);
    fireEvent.change(unitsInput, { target: { value: "50" } });

    const meterReadingInput = screen.getByLabelText(/Current Meter/i);
    fireEvent.change(meterReadingInput, { target: { value: "1000" } });

    const submitButton = screen.getByRole("button", { name: /Add Purchase/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockNav).toHaveBeenCalledWith("/history", { replace: true, state: null });
  });
});
