import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Rates from "./Rates";
import { useRateHistory } from "../hooks/useRates";
import type { ElectricityRate } from "../hooks/useRates";
import { useAuth } from "../hooks/useAuth";
import { usePurchases } from "../hooks/usePurchase";
import type { Id } from "../../convex/_generated/dataModel";

interface MockDropdownMenuProps {
  children?: React.ReactNode;
  onClick?: () => void;
}

vi.mock("../hooks/useRates");
vi.mock("../hooks/useAuth");
vi.mock("../hooks/usePurchase");

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

function rate(overrides: Omit<Partial<ElectricityRate>, "_id"> & { _id: string }): ElectricityRate {
  return {
    tier_number: 1,
    tier_label: "Tier 1",
    min_units: 1,
    max_units: 100,
    rate: 3.42585,
    ...overrides,
    _id: overrides._id as Id<"electricity_rates">,
  };
}

const renderPage = () =>
  render(
    <BrowserRouter>
      <Rates />
    </BrowserRouter>
  );

describe("Rates Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "1" } as NonNullable<ReturnType<typeof useAuth>["user"]>,
      loading: false,
      signOut: vi.fn(),
    });
    vi.mocked(usePurchases).mockReturnValue({
      loading: false,
      purchases: [],
      offlineCount: 0,
    } as unknown as ReturnType<typeof usePurchases>);
    vi.mocked(useRateHistory).mockReturnValue({ history: [], loading: false });
  });

  it("renders loading state while history loads", () => {
    vi.mocked(useRateHistory).mockReturnValue({ history: [], loading: true });

    renderPage();

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
  });

  it("shows an empty message when no rates are configured", () => {
    renderPage();

    expect(screen.getByText(/No rates have been configured yet/i)).toBeInTheDocument();
  });

  it("renders a column per tier and a row per period", () => {
    vi.mocked(useRateHistory).mockReturnValue({
      history: [
        rate({ _id: "1", tier_number: 1, rate: 3.42 }),
        rate({ _id: "2", tier_number: 2, min_units: 101, max_units: 400, rate: 4.01 }),
      ],
      loading: false,
    });

    renderPage();

    expect(screen.getByText("Tier 1")).toBeInTheDocument();
    expect(screen.getByText("Tier 2")).toBeInTheDocument();
    expect(screen.getByText(/3\.42/)).toBeInTheDocument();
    expect(screen.getByText(/4\.01/)).toBeInTheDocument();
  });

  it("dates undated legacy rows as the 2025-07-01 baseline tariff", () => {
    vi.mocked(useRateHistory).mockReturnValue({
      history: [rate({ _id: "1", rate: 3.42585 })],
      loading: false,
    });

    renderPage();

    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  it("shows the percentage change against the previous period", () => {
    vi.mocked(useRateHistory).mockReturnValue({
      history: [
        rate({ _id: "1", tier_number: 1, rate: 100 }),
        rate({ _id: "2", tier_number: 1, rate: 110, effectiveFrom: "2026-07-01" }),
      ],
      loading: false,
    });

    renderPage();

    expect(screen.getByText("+10.0%")).toBeInTheDocument();
  });

  it("marks a future period as upcoming and the active one as current", () => {
    vi.mocked(useRateHistory).mockReturnValue({
      history: [
        rate({ _id: "1", rate: 3.42585, effectiveFrom: "2020-01-01" }),
        rate({ _id: "2", rate: 9.99, effectiveFrom: "2999-01-01" }),
      ],
      loading: false,
    });

    renderPage();

    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("does not offer any editing controls", () => {
    vi.mocked(useRateHistory).mockReturnValue({
      history: [rate({ _id: "1" })],
      loading: false,
    });

    renderPage();

    expect(screen.queryByTestId("edit-rate-button")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.getByText(/Contact an administrator/i)).toBeInTheDocument();
  });

  it("returns null when no user", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signOut: vi.fn(),
    });

    const { container } = renderPage();

    expect(container.querySelector("main")).toBeNull();
  });
});
