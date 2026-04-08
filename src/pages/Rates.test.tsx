import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Rates from "./Rates";
import { useRates } from "../hooks/useRates";
import type { ElectricityRate } from "../hooks/useRates";
import { useUserRole } from "../hooks/useUserRole";
import { useAuth } from "../hooks/useAuth";
import { usePurchases } from "../hooks/usePurchase";
import { useToast } from "../hooks/use-toast";
import type { Id } from "../../convex/_generated/dataModel";

interface MockDropdownMenuProps {
  children?: React.ReactNode;
  onClick?: () => void;
}

// Mock the hooks
vi.mock("../hooks/useRates");
vi.mock("../hooks/useUserRole");
vi.mock("../hooks/useAuth");
vi.mock("../hooks/usePurchase");
vi.mock("../hooks/use-toast");

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

describe("Rates Page", () => {
  const mockToast = vi.fn();

  const adminRate: ElectricityRate = {
    _id: "1" as Id<"electricity_rates">,
    tier_number: 1,
    tier_label: "Tier 1",
    min_units: 0,
    max_units: 100,
    rate: 3.42,
  };

  const setupAdminWithRate = (updateRate = vi.fn().mockResolvedValue({ error: null })) => {
    vi.mocked(useRates).mockReturnValue({
      loading: false,
      rates: [adminRate],
      updateRate,
      refetch: vi.fn(),
    });
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: true });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({
      toast: mockToast,
      toasts: [],
      dismiss: vi.fn(),
    } as unknown as ReturnType<typeof useToast>);
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "1" } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut: vi.fn(),
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
      getAverageMonthlyUsage: vi.fn(() => 0),
      getDailyAverageUsage: vi.fn(() => 0),
      getAverageMonthlyCost: vi.fn(() => 0),
      getCurrentMonthPurchases: vi.fn(() => []),
      getRefillAnalysis: vi.fn(() => []),
      offlineCount: 0,
    } as unknown as ReturnType<typeof usePurchases>);
  });

  it("renders loading state", () => {
    vi.mocked(useRates).mockReturnValue({
      loading: true,
      rates: [],
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
    vi.mocked(useUserRole).mockReturnValue({ loading: true, isAdmin: false });

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("renders rates table", () => {
    vi.mocked(useRates).mockReturnValue({
      loading: false,
      rates: [
        {
          _id: "1",
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 0,
          max_units: 100,
          rate: 3.42,
        } as ElectricityRate,
      ],
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: false });

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    expect(screen.getAllByText(/Electricity Rates/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Tier 1")).toBeInTheDocument();
    expect(screen.getByText(/3.42/)).toBeInTheDocument();
  });

  it("shows update buttons for admins", () => {
    vi.mocked(useRates).mockReturnValue({
      loading: false,
      rates: [
        {
          _id: "1",
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 0,
          max_units: 100,
          rate: 3.42,
        } as ElectricityRate,
      ],
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: true });

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    // There are multiple buttons
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  it("opens update dialog when pencil is clicked", () => {
    vi.mocked(useRates).mockReturnValue({
      loading: false,
      rates: [
        {
          _id: "1",
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 0,
          max_units: 100,
          rate: 3.42,
        } as ElectricityRate,
      ],
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: true });

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    // Find the pencil button using testid
    const editButton = screen.getByTestId("edit-rate-button");
    expect(editButton).toBeInTheDocument();

    // Click edit button
    fireEvent.click(editButton);

    // Should show Input
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
    // Should show Save and Cancel buttons (Check and X icons)
    const buttons = screen.getAllByRole("button");
    const saveButton = buttons.find((b) => b.querySelector(".lucide-check"));
    const cancelButton = buttons.find((b) => b.querySelector(".lucide-x"));

    expect(saveButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();

    // Click cancel
    fireEvent.click(cancelButton as HTMLElement);

    // Input should be gone
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("handles save rate click", () => {
    const updateRate = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(useRates).mockReturnValue({
      loading: false,
      rates: [
        {
          _id: "1",
          tier_number: 1,
          tier_label: "Tier 1",
          min_units: 0,
          max_units: 100,
          rate: 3.42,
        } as ElectricityRate,
      ],
      updateRate,
      refetch: vi.fn(),
    });
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: true });

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId("edit-rate-button"));

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "3.5" } });

    const saveButton = screen.getAllByRole("button").find((b) => b.querySelector(".lucide-check"));
    fireEvent.click(saveButton as HTMLElement);
  });

  it("handles logout click", () => {
    const signOut = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "1" } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut,
    });
    vi.mocked(useRates).mockReturnValue({
      loading: false,
      rates: [],
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: false });

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    const logoutButton = screen.getByText(/Log out/i);
    expect(logoutButton).toBeInTheDocument();

    fireEvent.click(logoutButton);

    expect(signOut).toHaveBeenCalled();
  });

  it("returns null when no user", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signOut: vi.fn(),
    });
    vi.mocked(useRates).mockReturnValue({
      loading: false,
      rates: [],
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
    vi.mocked(useUserRole).mockReturnValue({ loading: false, isAdmin: false });

    const { container } = render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows error toast when rate value is NaN", () => {
    setupAdminWithRate();

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId("edit-rate-button"));

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "abc" } });

    const saveButton = screen.getAllByRole("button").find((b) => b.querySelector(".lucide-check"));
    fireEvent.click(saveButton as HTMLElement);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Invalid rate", variant: "destructive" })
    );
  });

  it("shows error toast when rate is zero", () => {
    setupAdminWithRate();

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId("edit-rate-button"));

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "0" } });

    const saveButton = screen.getAllByRole("button").find((b) => b.querySelector(".lucide-check"));
    fireEvent.click(saveButton as HTMLElement);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Invalid rate", variant: "destructive" })
    );
  });

  it.skip("shows error toast when updateRate returns error", () => {
    setupAdminWithRate(vi.fn().mockResolvedValue({ error: "Permission denied" }));

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId("edit-rate-button"));

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "4.5" } });

    const saveButton = screen.getAllByRole("button").find((b) => b.querySelector(".lucide-check"));
    fireEvent.click(saveButton as HTMLElement);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Error", variant: "destructive" })
    );
  });

  it.skip("shows success toast when updateRate succeeds", () => {
    setupAdminWithRate(vi.fn().mockResolvedValue({ error: null }));

    render(
      <BrowserRouter>
        <Rates />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByTestId("edit-rate-button"));

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "4.5" } });

    const saveButton = screen.getAllByRole("button").find((b) => b.querySelector(".lucide-check"));
    fireEvent.click(saveButton as HTMLElement);

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Success" }));
  });
});
