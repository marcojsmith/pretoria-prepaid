import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { NavLink } from "./NavLink";
import { DashboardStats } from "./DashboardStats";
import { TierProgress } from "./TierProgress";
import { useRates } from "../hooks/useRates";
import type { Id } from "../../convex/_generated/dataModel";

vi.mock("../hooks/useRates");

const MOCK_RATES = [
  {
    _id: "1" as Id<"electricity_rates">,
    tier_number: 1,
    tier_label: "Tier 1",
    min_units: 1,
    max_units: 100,
    rate: 3.42585,
  },
  {
    _id: "2" as Id<"electricity_rates">,
    tier_number: 2,
    tier_label: "Tier 2",
    min_units: 101,
    max_units: 400,
    rate: 4.00936,
  },
  {
    _id: "3" as Id<"electricity_rates">,
    tier_number: 3,
    tier_label: "Tier 3",
    min_units: 401,
    max_units: 650,
    rate: 4.36816,
  },
  {
    _id: "4" as Id<"electricity_rates">,
    tier_number: 4,
    tier_label: "Tier 4",
    min_units: 651,
    max_units: null,
    rate: 4.70902,
  },
];

describe("Application Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRates).mockReturnValue({
      rates: MOCK_RATES,
      loading: false,
      updateRate: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it("renders NavLink", () => {
    render(
      <BrowserRouter>
        <NavLink to="/">Home</NavLink>
      </BrowserRouter>
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("does not apply pendingClassName in the initial non-pending state", () => {
    render(
      <BrowserRouter>
        <NavLink
          to="/test-pending"
          className="base"
          activeClassName="active"
          pendingClassName="pending"
        >
          Test Link
        </NavLink>
      </BrowserRouter>
    );
    const link = screen.getByText("Test Link");
    expect(link).toBeInTheDocument();
    expect(link).not.toHaveClass("pending");
  });

  it("renders DashboardStats correctly", () => {
    const { getAllByText, rerender } = render(
      <BrowserRouter>
        <DashboardStats averageMonthlyUsage={300} averageMonthlyCost={1000} />
      </BrowserRouter>
    );
    expect(getAllByText(/300/).length).toBeGreaterThan(0);
    expect(getAllByText(/kWh/i).length).toBeGreaterThan(0);

    // Test zero usage path
    rerender(
      <BrowserRouter>
        <DashboardStats averageMonthlyUsage={0} averageMonthlyCost={0} />
      </BrowserRouter>
    );
    expect(screen.getAllByText(/R 0.00/i).length).toBeGreaterThanOrEqual(2);
  });

  it("renders TierProgress", () => {
    render(<TierProgress unitsBought={50} />);
    expect(screen.getByText(/Tier 1/)).toBeInTheDocument();
    expect(screen.getByText(/50 \/ 100 kWh/)).toBeInTheDocument();
  });
});
