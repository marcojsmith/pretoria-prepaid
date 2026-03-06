import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
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
  const mockAddReading = vi.fn();
  const mockDeleteReading = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
      addReading: mockAddReading,
      deleteReading: mockDeleteReading,
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
          reading: 120.5,
          date: "2024-03-05",
          _creationTime: Date.now(),
          userId: "user1",
        },
      ],
      stats: null,
      addReading: mockAddReading,
      deleteReading: mockDeleteReading,
    });

    render(
      <BrowserRouter>
        <HistoryPage />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText("Readings"));
    expect(screen.getByText("120.5 kWh")).toBeInTheDocument();

    const deleteBtn = screen.getAllByRole("button").find((b) => b.querySelector(".lucide-trash2"));

    await act(async () => {
      fireEvent.click(deleteBtn!);
    });

    expect(mockDeleteReading).toHaveBeenCalledWith("r1");
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

    const submitButton = screen.getByRole("button", { name: /Add Purchase/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(mockAddPurchase).toHaveBeenCalled();
  });

  it("filters purchases and readings by date", async () => {
    const marchPurchase = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _id: "p1" as any,
      date: "2024-03-15",
      units: 100,
      cost: 200,
      amountPaid: 200,
      tierBreakdown: [],
    };
    const februaryPurchase = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    expect(screen.getByText("100 kWh")).toBeInTheDocument();
    expect(screen.getByText("50 kWh")).toBeInTheDocument();

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
    expect(screen.getByText("100 kWh")).toBeInTheDocument();
    expect(screen.queryByText("50 kWh")).not.toBeInTheDocument();
  });

  it("calculates availableYears from both purchases and readings", () => {
    const marchPurchase = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _id: "p1" as any,
      date: "2024-03-15",
      units: 100,
      cost: 200,
      amountPaid: 200,
      tierBreakdown: [],
    };
    const oldReading = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _id: "r1" as any,
      date: "2023-12-15",
      reading: 100,
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
      addReading: vi.fn(),
      deleteReading: vi.fn(),
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
});
