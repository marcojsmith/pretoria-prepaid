import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import CalculatorPage from "./CalculatorPage";
import { usePurchases } from "../hooks/usePurchase";
import { useAuth } from "../hooks/useAuth";
import { useRates } from "../hooks/useRates";

interface MockDropdownMenuProps {
  children?: React.ReactNode;
  onClick?: () => void;
}

// Mock everything
vi.mock("../hooks/usePurchase");
vi.mock("../hooks/useAuth");
vi.mock("../hooks/useRates");

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

describe("CalculatorPage", () => {
  const mockSignOut = vi.fn();

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
      addPurchase: vi.fn(),
      addBatchPurchases: vi.fn(),
      deletePurchase: vi.fn(),
      unitsThisMonth: 0,
      costThisMonth: 0,
      getMonthlyStats: vi.fn(() => []),
      getAverageMonthlyUsage: vi.fn(() => 300),
      getDailyAverageUsage: vi.fn(() => 10),
      getAverageMonthlyCost: vi.fn(() => 1000),
      getCurrentMonthPurchases: vi.fn(() => []),
      getRefillAnalysis: vi.fn(() => []),
      offlineCount: 0,
    } as ReturnType<typeof usePurchases>);
    vi.mocked(useRates).mockReturnValue({
      loading: false,
      rates: [],
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it("renders correctly", () => {
    render(
      <BrowserRouter>
        <CalculatorPage />
      </BrowserRouter>
    );
    expect(screen.getByText(/Smart Calculator/i)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      signOut: vi.fn(),
    });
    const { container } = render(
      <BrowserRouter>
        <CalculatorPage />
      </BrowserRouter>
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("handles logout", async () => {
    render(
      <BrowserRouter>
        <CalculatorPage />
      </BrowserRouter>
    );

    const logoutButton = screen.getByText(/Log out/i);
    expect(logoutButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(logoutButton);
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it("returns null when no user", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signOut: vi.fn(),
    });
    const { container } = render(
      <BrowserRouter>
        <CalculatorPage />
      </BrowserRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it("handles navigation state for reading prefill", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "1" } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut: vi.fn(),
    });

    render(
      <BrowserRouter>
        <CalculatorPage />
      </BrowserRouter>
    );
  });
});
